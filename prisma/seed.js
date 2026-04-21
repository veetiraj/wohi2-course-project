const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
        id: 1,
        question: "Who is the president of Finland?",
        answer: "Alexander Stubb",
        keywords: ["finland", "president"]
    },
    {
        id: 2,
        question: "What is the capital of Finland?",
        answer: "Helsinki",
        keywords: ["finland", "capital"]
    },
    {
        id: 3,
        question: "Is Finnish winter cold?",
        answer: "Yes",
        keywords: ["finland", "winter"]
    },
    {
        id: 4,
        question: "Do you like beer?",
        answer: "Yes",
        keywords: ["beer"]
    },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

