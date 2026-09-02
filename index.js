import CompileInstruction from "./scrapingLogic.js";
import express from "express"

const app = express();
app.use(express.json());
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
