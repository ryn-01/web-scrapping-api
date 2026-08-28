import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

let dataCount = 0;
const collectedData = {};

import rf, { link } from "fs";
import { resolve } from "dns";
function GetInstruction(filePath) {
  try {
    return JSON.parse(rf.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.log(err.message);
  }
}

const method = {
  goto: async (page, value) => await page.goto(value),

  waitFor: async (page, value) => await page.waitForSelector(value),

  locate: async (page, data, browser) => {
    const target = await page.locator(data.selector);

    if (data.type == "input") {
      await target.fill(data.query);
      await page.keyboard.press("Enter");
    } else if (data.type == "button") {
      await target.click();
    } else if (data.type == "link") {
      const rawlistLinks = await page.$$eval(data.selector, (elements) => {
        return elements.map((el) => el.href);
      });
      const filteredLinks = [...new Set(rawlistLinks)];
      page.goto(filteredLinks[0]);
    }
  },

  get: async (page, data) => {
    await page.waitForSelector(data.selector);

    collectedData[data.selector + `-${dataCount}`] = await page.$eval(
      data.selector,
      (el, selectedAtrb) => {
        let selectedData = {};
        selectedAtrb.forEach((atrb) => {
          selectedData[atrb] = el[atrb];
        });
        return selectedData;
      },
      data.atributes,
    );
    dataCount += 1;
  },
};

async function CompileInstruction(list) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  for (const [key, value] of Object.entries(list)) {
    await method[key.replace(/[^a-zA-Z]/g, "")](page, value, browser);
  }
}

const instrution = GetInstruction("instruction.json");
CompileInstruction(instrution);