const puppeteer = require("puppeteer");
const axios = require("axios");

const scrapeRankData = async () => {
  try {
    // Puppeteer configuration
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true, // Set to false for debugging
    });

    const page = await browser.newPage();

    // Navigate to the target URL
    const API_URL =
      process.env.VJUDGE_CONTEST_API ||
      "https://vjudge.net/contest/data?draw=2&start=0&length=20&sortDir=desc&sortCol=0&category=mine&running=3&title=&owner=Pbhustle&_=1733642420751";

    const { data } = await axios.get(API_URL);
    const ccode = data.data[0][0];
    const contestUrl = `https://vjudge.net/contest/${ccode}#rank`;

    await page.goto(contestUrl, { waitUntil: "networkidle2" });
    await page.waitForSelector("#contest-rank-table tbody");

    // Scrape rank data
    const rankData = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("#contest-rank-table tbody tr")
      );
      return rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
          rank: parseInt(cells[0]?.textContent?.trim() || "0"),
          name: cells[1]?.textContent?.trim() || "",
          score: parseInt(cells[2]?.textContent?.trim() || "0"),
        };
      });
    });

    await browser.close();

    return {
      message: "Scraping completed successfully",
      rankings: rankData,
      contestCode: ccode,
    };
  } catch (error) {
    console.error("Error during scraping:", error);
    return { error: "Failed to scrape rank data" };
  }
};

module.exports = { scrapeRankData };
