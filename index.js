import CompileInstruction from "./scrapingLogic.js";
import express from "express"
import rateLimit from "express-rate-limit";
import 'dotenv/config';

function checkApiKey(req, res, next){
  const clientKey = req.headers['x-api-key']
  const secretKey = process.env.APP_API_KEY

  if (clientKey === secretKey){
    next()
  } else {
    res.status(404).json({message: "Key Not Valid"})
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes in milliseconds
  limit: 50,               // Limit each IP to 5 requests per windowMs
  standardHeaders: 'draft-7', // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the older `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
});

app.use(globalLimiter);

app.post("/api/data", checkApiKey, async(req, res) => {
  const instruction = req.body;
  const result = await CompileInstruction(instruction)
  
  if (result.success) {
    res.status(201).json(result.data)
  } else {
    res.status(400).json({message: result.error})
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Listening At : ${process.env.PORT}`);
});
