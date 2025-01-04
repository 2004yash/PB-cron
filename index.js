require("dotenv").config();
const express = require("express");
const { scrapeRankData } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/api/ranks", async (req, res) => {
  try {
    const { rankings, contestCode } = await scrapeRankData();
    res.json({ rankings, contestCode });
  } catch (error) {
    console.error("Error fetching rank data:", error);
    res.status(500).json({ error: "Failed to fetch rank data" });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper service running on port ${PORT}`);
});
