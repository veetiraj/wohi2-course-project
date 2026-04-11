const express = require('express');
const router = express.Router();

const questions = require("../data/questions");
const e = require('express');

// GET /api/questions/, /api/questions?keyword=http
router.get("/", (req, res) => {
    const {keyword} = req.query;
    if (!keyword) {
        return res.json(questions);
    }
    const filteredQuestions = questions.filter(p=>p.keywords.includes(keyword));
    res.json(filteredQuestions);
});

// GET /api/questions/:questionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, answer, keywords} = req.body;

    const oldQuestion = questions.find ((p) => p.id === questionId);

    if (!oldQuestion) {
        return res.status(404).json({ message: "Post not found"});
    }
    if (!question || !answer) {
        return res.json({
            message: "question and answer are required"
        });
    }

    oldQuestion.question = question;
    oldQuestion.answer = answer;
    oldQuestion.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(oldQuestion);
});

// POST /api/questions
router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }
    const existingIds = questions.map(p=>p.id)
    const maxId = Math.max(...existingIds)
    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});
// PUT /api/questions/:questionId

router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const {question, answer, keywords} = req.body;

    const oldQuestion = questions.find ((p) => p.id === questionId);

    if (!oldQuestion) {
        return res.status(404).json({ message: "Post not found"});
    }
    if (!question || !answer) {
        return res.json({
            message: "question and answer are required"
        });
    }

    oldQuestion.question = question;
    oldQuestion.answer = answer;
    oldQuestion.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(oldQuestion);
});

//DELETE /api/posts/:postId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex(p=> p.id === questionId);

    if (questionIndex === -1) {
        return res.status(404).json({msg: "Question not found"})
    }
    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg: "Question deleted succesfully",
        question: deletedQuestion
    });
})

module.exports = router;