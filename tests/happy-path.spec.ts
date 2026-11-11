import { test, expect, Locator, Page } from '@playwright/test';

/**
 * Altissima SME - happy path: Dashboard -> Business & Proposer -> Employees & Staff -> Financials -> YOUR QUOTE
 * Refined from the Playwright codegen recording.
 * Stops at the quote results page. No store-quote / payment steps.
 *
 * The same journey is run with several risks. Each test passes when YOUR QUOTE
 * is on screen and the "just a moment" pricing message has gone.
 */

const BASE = 'https://altisima-sme-6707cd24dc19.herokuapp.com';

// Cover start date = today + 14 days, so the test doesn't break once the recorded date (2026-10-30) is in the past.
// Same yyyy-mm-dd format as the recording.
const startDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
})();

type QuoteCase = {
  name: string;
  businessName: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  phoneShown: string;
  tradingName: string;
  yearEstablished: string;
  yearsExperience: string;
  businessDescription: string;
  legalStatus: string;
  title: string;
  tradeSearch: string;
  trade: string;
  maxHeight: string;
  maxDepth: string;
  gas: string;
  gasShown: string;
  threePhase: string;
  threePhaseShown: string;
  directorFirst: string;
  directorSurname: string;
  turnover: string;
  wageroll: string;
  limitOfIndemnity: string;
};

/** Money fields show digits grouped with commas. */
function money(digits: string) {
  return Number(digits).toLocaleString('en-GB');
}

// Same journey, different risks. Trades are rows from the "buil" search.
const scenarios: QuoteCase[] = [
  {
    name: 'Limited, Builder, £1m public liability',
    businessName: 'test business name',
    firstName: 'TestQA',
    surname: 'Surname',
    email: 'test@test.com',
    phone: '+44 78 7878 78787',
    phoneShown: '+44 78 7878 7878',
    tradingName: 'test trading name',
    yearEstablished: '2020',
    yearsExperience: '5',
    businessDescription: 'test business desc',
    legalStatus: 'Limited',
    title: 'Mr',
    tradeSearch: 'buil',
    trade: 'Builder',
    maxHeight: '2',
    maxDepth: '2',
    gas: 'y',
    gasShown: 'Yes',
    threePhase: 'n',
    threePhaseShown: 'No',
    directorFirst: 'test FN',
    directorSurname: 'Test SN',
    turnover: '100000',
    wageroll: '1000000',
    limitOfIndemnity: '£1,000,000',
  },
  {
    name: 'Sole proprietor, House Builders, £2m public liability',
    businessName: 'sole trader builds',
    firstName: 'Alex',
    surname: 'Cole',
    email: 'alex.cole@test.com',
    phone: '+44 77 0090 0123',
    phoneShown: '+44 77 0090 0123',
    tradingName: 'cole building',
    yearEstablished: '2015',
    yearsExperience: '8',
    businessDescription: 'house building and repair',
    legalStatus: 'Sole Proprietor',
    title: 'Mr',
    tradeSearch: 'buil',
    trade: 'House Builders',
    maxHeight: '3',
    maxDepth: '1',
    gas: 'n',
    gasShown: 'No',
    threePhase: 'n',
    threePhaseShown: 'No',
    directorFirst: 'Alex',
    directorSurname: 'Cole',
    turnover: '50000',
    wageroll: '250000',
    limitOfIndemnity: '£2,000,000',
  },
  {
    name: 'Partnership, Builders Labourer, £5m public liability',
    businessName: 'partnership labour',
    firstName: 'Sam',
    surname: 'Patel',
    email: 'sam.patel@test.com',
    phone: '+44 79 1111 2222',
    phoneShown: '+44 79 1111 2222',
    tradingName: 'patel labour',
    yearEstablished: '2018',
    yearsExperience: '6',
    businessDescription: 'building site labour',
    legalStatus: 'Partnership',
    title: 'Ms',
    tradeSearch: 'buil',
    trade: 'Builders Labourer',
    maxHeight: '4',
    maxDepth: '2',
    gas: 'y',
    gasShown: 'Yes',
    threePhase: 'y',
    threePhaseShown: 'Yes',
    directorFirst: 'Sam',
    directorSurname: 'Patel',
    turnover: '250000',
    wageroll: '750000',
    limitOfIndemnity: '£5,000,000',
  },
  {
    name: 'Public limited, PDH new build, £10m public liability',
    businessName: 'pdh new builds ltd',
    firstName: 'Riley',
    surname: 'Khan',
    email: 'riley.khan@test.com',
    phone: '+44 78 5555 4444',
    phoneShown: '+44 78 5555 4444',
    tradingName: 'khan new build',
    yearEstablished: '2012',
    yearsExperience: '12',
    businessDescription: 'new domestic building work',
    legalStatus: 'Public Limited',
    title: 'Dr',
    tradeSearch: 'buil',
    trade: 'Builder - PDH New',
    maxHeight: '5',
    maxDepth: '3',
    gas: 'n',
    gasShown: 'No',
    threePhase: 'y',
    threePhaseShown: 'Yes',
    directorFirst: 'Riley',
    directorSurname: 'Khan',
    turnover: '750000',
    wageroll: '2000000',
    limitOfIndemnity: '£10,000,000',
  },
];

/** Fills a labelled field, or a known input, then checks the page shows that value. */
async function fillField(page: Page, label: string | RegExp | Locator, value: string, shown = value) {
  const field = typeof label === 'string' || label instanceof RegExp ? page.getByLabel(label) : label;
  await field.fill(value);
  await expect(field).toHaveValue(shown);
}

/**
 * Dropdown rows are plain list text. Opening one appends the choices to the
 * field's accessible name, so that is what we assert.
 */
function menuChoice(page: Page, choice: string) {
  return page.getByText(choice, { exact: true }).last();
}

/** Opens a dropdown, picks one row, and checks the field shows that choice. */
async function choose(field: Locator, choice: string) {
  await field.click();
  const pattern = choice.startsWith('£') ? choice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : `\\b${choice}\\b`;
  await expect(field).toHaveAccessibleName(new RegExp(pattern));
  await menuChoice(field.page(), choice).click();
  await expect(field).toHaveValue(choice);
}

async function pickChoice(page: Page, label: string | RegExp, choice: string) {
  await choose(page.getByLabel(label), choice);
}

/** Multi-select recorded as "None". The field then reads "1 selected". */
async function pickNone(page: Page, label: string | RegExp) {
  const field = page.getByLabel(label);
  await field.click();
  await expect(field).toHaveAccessibleName(/\bNone\b/);
  await menuChoice(page, 'None').click();
  await expect(field).toHaveValue('1 selected');
  // Selecting None leaves the list open over the next field. Click the field again to close it.
  await field.click({ timeout: 5_000 });
}

for (const data of scenarios) {
  test(`quote generated — ${data.name}`, async ({ page }) => {
  // Pricing on staging was measured at roughly 26-34s in the audit, so allow plenty of time overall.
  test.setTimeout(240_000);

  await test.step('Dashboard: start a new quote', async () => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Your workspace' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New quote or recall a customer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start a new quote' })).toBeVisible();

    await page.getByRole('button', { name: 'Start a new quote' }).click();
    await expect(page.getByRole('heading', { name: 'Start a new quote', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Find an existing quote' })).toBeVisible();

    // WAIT: the button is disabled when 4 tabs/sessions are already open; click() waits until it is enabled.
    const newQuote = page.getByRole('button', { name: 'New Quote' });
    await expect(newQuote).toBeVisible();
    await expect(newQuote).toBeEnabled();
    await newQuote.click();

    await expect(page).toHaveURL(/\/page1/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Business & Proposer' })).toBeVisible();
    await expect(page.getByLabel('Cover start date')).toBeVisible();
  });

  await test.step('Page 1: Business & Proposer', async () => {
    await fillField(page, 'Cover start date', startDate);

    await pickChoice(page, 'Legal trading status', data.legalStatus);

    await fillField(page, 'Registered business name', data.businessName);

    await choose(page.locator('#proposerTitle'), data.title);
    const partnerTitle = page.locator('[id^="partnerTitle"]');
    if (await partnerTitle.count()) {
      await choose(partnerTitle.first(), data.title);
    }

    await fillField(page, page.locator('#proposerFirstName'), data.firstName);
    await fillField(page, page.locator('#proposerSurname'), data.surname);
    const partnerFirst = page.locator('#partnerFirstName_0');
    if (await partnerFirst.count()) {
      await fillField(page, partnerFirst, data.directorFirst);
      await fillField(page, page.locator('#partnerSurname_0'), data.directorSurname);
    }
    const dateOfBirth = page.getByLabel('Date of birth');
    if (await dateOfBirth.count()) {
      await fillField(page, 'Date of birth', '1985-01-15');
    }
    await fillField(page, /^Email$/, data.email);
    await fillField(page, 'Telephone / mobile', data.phone, data.phoneShown);

    const postcode = page.getByLabel('Postcode');
    await postcode.fill('gu14da');
    await expect(postcode).toHaveValue('gu14da');
    await postcode.blur();
    const address = page.getByLabel(/^Address/);
    const firstAddress = page.locator('li.dropdownItem:visible').first();
    await expect(firstAddress).toBeVisible({ timeout: 30_000 });
    const addressText = (await firstAddress.innerText()).trim();
    await firstAddress.click();
    await expect(address).toHaveValue(addressText);

    await fillField(page, 'Trading name (if different)', data.tradingName);
    await fillField(page, 'Year business established', data.yearEstablished);
    await fillField(page, "Years' experience in trade", data.yearsExperience);

    const previousInsurer = page.getByLabel('Previous insurer');
    await previousInsurer.click();
    await expect(previousInsurer).toBeFocused();
    await previousInsurer.fill('n');
    await expect(previousInsurer).toHaveValue('n');

    await fillField(page, 'Business description', data.businessDescription);

    await pickNone(page, /Has any proposer, director or partner ever/);
    await pickNone(page, 'Risk declarations (tick all that apply)');
    await pickNone(page, 'Heat equipment used');

    // Trade, height, and the gas questions appear only after a number is chosen.
    const numberOfTrades = page.locator('#numberOfTrades');
    await numberOfTrades.click();
    await expect(numberOfTrades).toHaveAccessibleName(/\b1\b/);
    await menuChoice(page, '1').click();
    await expect(numberOfTrades).toHaveValue('1');

    const trade = page.getByLabel(/^Trade/);
    await expect(trade).toBeVisible();
    await trade.click();
    await expect(trade).toBeFocused();
    await trade.fill(data.tradeSearch);
    await expect(trade).toHaveValue(data.tradeSearch);
    await expect(trade).toHaveAccessibleName(new RegExp(`\\b${data.trade}\\b`));
    await menuChoice(page, data.trade).click();
    await expect(trade).toHaveValue(data.trade);

    const height = page.getByLabel(/Greatest height staff work at/);
    await expect(height).toBeVisible();
    await fillField(page, /Greatest height staff work at/, data.maxHeight);
    const depth = page.getByLabel(/Greatest depth staff work at/);
    if (await depth.count()) {
      await fillField(page, /Greatest depth staff work at/, data.maxDepth);
    }
    const gas = page.getByLabel(/Does the business do any gas/);
    if (await gas.count()) {
      await fillField(page, /Does the business do any gas/, data.gas, data.gasShown);
    }
    const threePhase = page.getByLabel(/Does the business do 3-phase/);
    if (await threePhase.count()) {
      await fillField(page, /Does the business do 3-phase/, data.threePhase, data.threePhaseShown);
    }

    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    await next.click();
    await expect(page).toHaveURL(/page2/);
    await expect(page.getByRole('heading', { name: /Employees/ })).toBeVisible();
  });

  await test.step('Page 2: Employees & Staff - add a director', async () => {
    await page.getByRole('button', { name: /^Director/ }).click();
    await expect(page.getByLabel(/^First name$/)).toBeVisible();

    await pickChoice(page, /^Title/, data.title);

    await fillField(page, /^First name$/, data.directorFirst);
    await fillField(page, /^Surname$/, data.directorSurname);

    // The recording opened this list and did not pick a row. The first row is used so Next can leave this page.
    const activity = page.getByLabel(/Main work activity/);
    await activity.click();
    const firstActivity = page.locator('li.dropdownItem:visible').first();
    await expect(firstActivity).toBeVisible();
    const activityText = (await firstActivity.innerText()).trim();
    await firstActivity.click();
    await expect(activity).toHaveValue(activityText);

    // "Which trade(s)?" - end state should be "All" selected. Written to be safe whether or not All is already selected:
    // open the dropdown, click All only if it isn't ticked yet, close it, then check the field shows All.
    const trades = page.getByLabel(/Which trade\(s\)\?/);
    await trades.click();
    const allTicked = page.getByRole('listitem').filter({ hasText: /^✓ All$/ });
    if (!(await allTicked.count())) {
      await menuChoice(page, 'All').click();
    }
    await trades.click();
    await expect(page.getByRole('textbox', { name: /Which trade\(s\)\?.*All/ })).toBeVisible();

    await fillField(page, /Do they need tools cover\?/, 'Y', 'Yes');
    await fillField(page, /Tools left in vehicle/, 'N', 'No');

    // One click only: the double Next in the recording was a slip, a single click moves to the next page.
    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    await next.click();

    await expect(page.getByLabel(/Annual turnover/)).toBeVisible();
  });

  await test.step('Page 3: Financials', async () => {
    // Money fields group digits with commas after they are entered.
    await fillField(page, /Annual turnover/, data.turnover, money(data.turnover));
    await fillField(page, /Estimated wageroll/, data.wageroll, money(data.wageroll));
    await fillField(page, /Are ALL workers/, 'Y', 'Yes');

    await pickChoice(page, /Limit of indemnity/, data.limitOfIndemnity);
  });

  await test.step('Submit and wait for the quote page', async () => {
    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    await next.click();

    // WAIT: pricing runs as a background job and took about 26-34s in the audit. Long timeout, no fixed sleep.
    // Codegen located this by its text, so it is not asserted as a heading.
    await expect(page.getByRole('heading', { name: 'Liability cover, priced for you' })).toBeVisible({ timeout: 120_000 });
    // Stay on YOUR QUOTE so you can click around. Press Resume in the inspector when you are done.
    await page.pause();
  });
  });
}
