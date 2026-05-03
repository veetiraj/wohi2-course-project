const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
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
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });
  console.log("Created user:", user.email);

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        userId: user.id,
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

