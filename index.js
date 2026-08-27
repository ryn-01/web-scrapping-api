import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const browser = await puppeteer.launch({headless:false, defaultViewport: null})
const page = await browser.newPage()

await page.goto('https://www.w3schools.com/python/python_intro.asp');


let selector = "#tnb-google-search-input"
let query = "Get Started C++"

await page.waitForSelector(selector)
await page.locator(selector).fill(query)
await page.keyboard.press("Enter")

await page.waitForSelector(".gsc-wrapper")
await page.waitForSelector(".gsc-result")

const rawlistLinks = await page.$$eval(
    'div.gsc-wrapper a',
    (elements) => {return elements.map(el => el.href)}
);

const filteredLinks = [... new Set(rawlistLinks)]



console.log(filteredLinks)
await page.goto(filteredLinks[0])

await page.setViewport({width: 1080, height: 1024});
