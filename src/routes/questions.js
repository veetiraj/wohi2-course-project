const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.resolve("public/uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Apply authentication to ALL routes in this router
router.use(authenticate);

//const questions = require("../data/questions");
const e = require('express');

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user?.name || null,
    attemptCount: question._count?.attempts ?? 0,
    attempted: question.attempts ? question.attempts.length > 0 : false,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined,
    _count: undefined,
  };
}


// GET /api/questions/, /api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
    const {keyword} = req.query;
    const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};
  
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [filteredQuestions, total] = await Promise.all ([prisma.question.findMany({
    where,
    include: {
      keywords: true, 
      user: true, 
      attempts: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { attempts: true } },
    },
    orderBy: { id: "asc" },
    skip,
    take: limit,
  }), prisma.question.count({where})
]);
  res.json({
    data: filteredQuestions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
});

// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const Question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
            keywords: true,
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } },
        },
    });

    if (!Question) {
        return res.status(404).json({message: "Question not found"});
    }
    res.json(formatQuestion(Question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    
    const newQuestion = await prisma.question.create({
    data: {
      question, answer, imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });
    
    res.status(201).json(formatQuestion(newQuestion));
});
// PUT /api/questions/:questionId

router.put("/:questionId", upload.single("image"), isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    const {question, answer, keywords} = req.body;

    const oldQuestion = await prisma.question.findUnique({ where: { id: questionId } });

    if (!oldQuestion) {
        return res.status(404).json({ message: "Question not found"});
    }
    if (!question || !answer) {
        return res.status(400).json({
            message: "question and answer are required"
        });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const newQuestion = await prisma.question.update({
    where: { id: questionId },
    data: {
      question, answer, imageUrl,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });


    res.json(formatQuestion(newQuestion));
});

//DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true, user: true },
    });

    if (!question) {
        return res.status(404).json({msg: "Question not found"})
    }
    
    await prisma.question.delete({ where: { id: questionId } });
    res.json({
        msg: "Question deleted succesfully",
        question: formatQuestion(question)
    });
})

// POST /api/questions/:questionId/attempt
router.post("/:questionId/attempt", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const attempt = await prisma.attempt.upsert({
        where: { userId_questionId: { userId: req.user.userId, questionId } },
        update: {},
        create: { userId: req.user.userId, questionId },
    });

    const attemptCount = await prisma.attempt.count({ where: { questionId } });

    res.status(201).json({
        id: attempt.id,
        questionId,
        attempted: true,
        attemptCount,
        createdAt: attempt.createdAt,
    });
});

// DELETE /api/questions/:questionId/attempt
router.delete("/:questionId/attempt", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.attempt.deleteMany({
        where: { userId: req.user.userId, questionId },
    });

    const attemptCount = await prisma.attempt.count({ where: { questionId } });

    res.json({ questionId, attempted: false, attemptCount });
});


router.post("/:questionId/play", authenticate, async (req, res) => {
  const questionId = Number(req.params.questionId);
  const { answer: submittedAnswer } = req.body;

  if (!submittedAnswer) {
    return res.status(400).json({ error: "Answer is required" });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const correct =
    question.answer.toLowerCase().trim() ===
    submittedAnswer.toLowerCase().trim();

  // create attempt ONLY if correct (or you can remove this condition if you want all attempts stored)
  const attempt = await prisma.attempt.upsert({
    where: {
      userId_questionId: {
        userId: req.user.userId,
        questionId,
      },
    },
    update: {},
    create: {
      userId: req.user.userId,
      questionId,
    },
  });

  res.json({
    id: attempt.id,
    correct,
    submittedAnswer,
    correctAnswer: question.answer,
    createdAt: attempt.createdAt.toISOString(),
  });
});

module.exports = router;
