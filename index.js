import CompileInstruction from "./scrapingLogic.js";
import express from "express"
import rateLimit from "express-rate-limit";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  limit: 5,               // Limit each IP to 5 requests per windowMs
  standardHeaders: 'draft-7', // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the older `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
});

const app = express();
app.use(express.json());
app.use(globalLimiter);

const PORT = 3000;

app.post("/api/data", async(req, res) => {
  const instruction = req.body;
  const result = await CompileInstruction(instruction)
  
  if (result.success) {
    res.status(201).json(result.data)
  } else {
    res.status(400).json({message: result.error})
  }
});

app.listen(PORT, () => {
  console.log(`Listening At : ${PORT}`);
});
