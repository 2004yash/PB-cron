const puppeteer = require("puppeteer");
const axios = require("axios");

const scrapeRankData = async () => {
  try {
    const API_URL =
      process.env.VJUDGE_CONTEST_API ||
      "https://vjudge.net/contest/data?draw=2&start=0&length=20&sortDir=desc&sortCol=0&category=mine&running=3&title=&owner=Pbhustle&_=1733642420751";

    const { data } = await axios.get(API_URL);
    const ccode = data.data[0][0];
    const url = `https://vjudge.net/contest/${ccode}#rank`;

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true, // Keep this true for production
    });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded" }); // Ensures the DOM is loaded
    await page.waitForTimeout(5000); // Additional wait for AJAX content

    // Check if rank table is fully loaded
    await page.waitForSelector("#contest-rank-table tbody tr");

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

    return { rankData, contestCode: ccode };
  } catch (error) {
    console.error("Error during scraping:", error);
    throw new Error("Failed to scrape rank data");
  }
};

module.exports = scrapeRankData;
