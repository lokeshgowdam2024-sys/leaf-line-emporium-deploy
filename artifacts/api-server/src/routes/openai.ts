import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const PLANT_SYSTEM_PROMPT = `You are Leafy, LEAFLINE's expert plant care assistant. You are friendly, knowledgeable, and passionate about plants.

You help users with:
- Plant care guidance (watering, light, fertilizing)
- Disease diagnosis and treatment suggestions
- Placement advice for different rooms
- Watering schedules and reminders
- Humidity and temperature requirements
- Seasonal care adjustments
- Identifying plants from descriptions
- Recommending plants based on lifestyle and environment
- Troubleshooting common plant problems (yellow leaves, root rot, pests)

Keep responses concise, warm, and practical. Use plant emojis occasionally to keep things friendly. Always give actionable advice.`;

router.get("/conversations", requireAuth, async (req, res) => {
  const convs = await db.select()
    .from(conversations)
    .where(eq(conversations.userId, req.user!.id))
    .orderBy(asc(conversations.updatedAt));
  res.json(convs);
});

router.post("/conversations", requireAuth, async (req, res) => {
  const { title } = req.body;
  const [conv] = await db.insert(conversations)
    .values({ title: title || "New Chat", userId: req.user!.id })
    .returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || conv.userId !== req.user!.id) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || conv.userId !== req.user!.id) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ message: "content required" }); return; }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || conv.userId !== (req.user!.id)) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({ conversationId: id, role: "user", content });

  // Get conversation history
  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const chatMessages = [
    { role: "system" as const, content: PLANT_SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      max_tokens: 2048,
      messages: chatMessages,
    });

    fullResponse = completion.choices[0]?.message?.content ?? "";

    if (fullResponse) {
      res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`);
    }

    // Save assistant message
    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });

    // Update conversation updatedAt
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
    res.end();
  }
});

export default router;
