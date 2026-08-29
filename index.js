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
  goto: async (page, selector) =>
    await page.goto(selector, { waitUntil: "networkidle2" }),

  waitFor: async (page, selector) => await page.waitForSelector(selector),

  search: async (page, data) => {
    await page.locator(data.selector).fill(data.query);
    await page.keyboard.press("Enter");
  },

  clickBtn: async (page, selector) => await page.locator(selector).click(),

  clickLnk: async (page, selector) => {
    const link = await page.$eval(selector, el => el.href);
    await page.goto(link, {waitUntil: "networkidle2"})
  },

  input: async (page, data) => await page.locator(data.selector).fill(data.query),
    
  extract: async (page, data) => {
    await page.waitForSelector(data.selector);

    collectedData[dataCount] = await page.$eval(
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

  extractAll: async (page, data) => {
    await page.waitForSelector(data.selector);

    collectedData[dataCount] = await page.$$eval(
      data.selector,
      (els, selectedAtrb) => {
        let result = {};
        els.forEach((el, index) => {
          let selectedData = {};

          for (let i = 0; i < selectedAtrb.length; i++) {
            let atrbName = selectedAtrb[i];
            selectedData[atrbName] = el[atrbName];
          }
          result[index + 1] = selectedData;
        });
        return result;
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
    await method[key.replace(/[^a-zA-Z]/g, "")](page, value);
  }

  console.log(collectedData);
  browser.close();
}

const instrution = GetInstruction("instruction.json");
CompileInstruction(instrution);