import {
  CommandName,
  CommandResult,
  Product,
  RequestParams,
  TrolleyItem,
} from "../../shared/protocol";
import { nextRouter } from "./nextRouter";

console.log("Coles DOM script loaded");

const COLES_ORIGIN = "https://www.coles.com.au";
const BROWSE_URL = `${COLES_ORIGIN}/browse`;

const TIMEOUT_MS = 12000;

const CATEGORY_IGNORE = new Set([
  "Shop products",
  "Browse Products",
  "Specials & catalogues",
  "Bought before",
  "More",
]);

const normalizeText = (value: string) => {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const waitForCondition = async (
  check: () => boolean,
  timeoutMs = TIMEOUT_MS
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) {
      return;
    }
    await sleep(120);
  }
  throw new Error("Timed out waiting for page condition.");
};

const waitForSelector = async (selector: string, timeoutMs = TIMEOUT_MS) => {
  await waitForCondition(
    () => Boolean(document.querySelector(selector)),
    timeoutMs
  );
};

const findNavCategories = (): HTMLAnchorElement[] => {
  const navs = Array.from(document.querySelectorAll("nav"));
  for (const nav of navs) {
    const links = Array.from(
      nav.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/browse"], a[href*="/browse/"]'
      )
    );
    if (links.length >= 8) {
      return links;
    }
  }
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/browse"], a[href*="/browse/"]'
    )
  );
};

const ensureOnBrowsePage = async () => {
  await navigateTo(BROWSE_URL);
};

const navigateTo = async (url: string) => {
  await nextRouter.push(url);
};

const uniqueTexts = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
};

const matchLinkByText = (links: HTMLAnchorElement[], text: string) => {
  const target = normalizeText(text);
  return (
    links.find((link) => normalizeText(link.textContent ?? "") === target) ??
    links.find((link) =>
      normalizeText(link.textContent ?? "").includes(target)
    ) ??
    null
  );
};

const openCategory = async (categoryName: string) => {
  await ensureOnBrowsePage();
  await waitForSelector("a");
  const links = findNavCategories();
  const link = matchLinkByText(links, categoryName);
  if (!link) {
    throw new Error(`Category not found: ${categoryName}`);
  }
  link.click();
  await waitForCondition(() =>
    normalizeText(document.title).includes(normalizeText(categoryName))
  );
};

const openSubcategory = async (
  categoryName: string,
  subCategoryName: string
) => {
  await openCategory(categoryName);
  await waitForSelector("main");
  const main = document.querySelector("main") ?? document.body;
  const subLinks = Array.from(
    main.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/browse"], a[href*="/browse/"]'
    )
  );
  const subLink = matchLinkByText(subLinks, subCategoryName);
  if (!subLink) {
    throw new Error(`Subcategory not found: ${subCategoryName}`);
  }
  subLink.click();
  await waitForCondition(() =>
    normalizeText(document.title).includes(normalizeText(subCategoryName))
  );
};

const extractPrice = (text: string) => {
  const match = text.match(/\$\d+(?:\.\d{2})?/);
  return match?.[0];
};

const extractSize = (text: string) => {
  const match = text.match(/\b\d+(?:\.\d+)?\s?(?:g|kg|ml|l|L|pack|pk)\b/);
  return match?.[0];
};

const extractProductsFromPage = (limit = 20, offset = 0): Product[] => {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Add "]')
  );
  const products: Product[] = [];

  for (const button of buttons) {
    const label = button.getAttribute("aria-label") ?? "";
    const nameMatch = label.match(/^Add (.*) to the trolley$/);
    if (!nameMatch) {
      continue;
    }
    const name = nameMatch[1];
    const tile =
      button.closest<HTMLElement>("article") ??
      button.closest<HTMLElement>('[data-testid*="product"]') ??
      button.closest<HTMLElement>("div");
    const link =
      tile?.querySelector<HTMLAnchorElement>('a[href*="/product"]') ??
      tile?.querySelector<HTMLAnchorElement>('a[href*="/items"]') ??
      null;
    const productUrl = link?.href;
    const productId = productUrl ?? `name:${name}`;
    const text = tile?.textContent ?? "";
    const price = extractPrice(text);
    const size = extractSize(text);
    const availability = button.disabled ? "unavailable" : "available";

    products.push({
      productId,
      name,
      price,
      size,
      availability,
      productUrl,
    });
  }

  return products.slice(offset, offset + limit);
};

const searchProducts = async (
  query: string,
  limit?: number,
  offset?: number
) => {
  const input =
    document.querySelector<HTMLInputElement>(
      'input[placeholder*="Search products"]'
    ) ?? document.querySelector<HTMLInputElement>('input[name="q"]');
  if (!input) {
    throw new Error("Search input not found.");
  }
  input.focus();
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const searchButton =
    document.querySelector<HTMLButtonElement>('button[aria-label="Search"]') ??
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => normalizeText(button.textContent ?? "") === "search"
    );
  if (searchButton) {
    searchButton.click();
  } else {
    input.form?.requestSubmit();
  }

  await waitForCondition(() => location.href.includes("/search/products"));
  await waitForSelector('button[aria-label^="Add "]');
  const products = extractProductsFromPage(limit, offset);
  return { query, products };
};

const findProductTileById = (productId: string) => {
  if (productId.startsWith("name:")) {
    const name = productId.replace("name:", "");
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Add "]')
    ).find((btn) => (btn.getAttribute("aria-label") ?? "").includes(name));
    return (
      button?.closest<HTMLElement>("article") ??
      button?.closest<HTMLElement>("div")
    );
  }

  const link = document.querySelector<HTMLAnchorElement>(
    `a[href="${CSS.escape(productId)}"]`
  );
  return (
    link?.closest<HTMLElement>("article") ?? link?.closest<HTMLElement>("div")
  );
};

const addToTrolley = async (productId: string) => {
  const tile = findProductTileById(productId);
  if (!tile) {
    throw new Error("Product not found on page.");
  }
  const addButton = tile.querySelector<HTMLButtonElement>(
    'button[aria-label^="Add "]'
  );
  if (!addButton) {
    throw new Error("Add button not found.");
  }
  addButton.click();
  await waitForCondition(() =>
    Boolean(
      tile.querySelector('button[aria-label^="Increase "]') ||
        tile.querySelector('input[role="spinbutton"]')
    )
  );
  const quantity = getTileQuantity(tile);
  return { productId, quantity };
};

const getTileQuantity = (tile: HTMLElement) => {
  const input = tile.querySelector<HTMLInputElement>(
    'input[role="spinbutton"]'
  );
  const value = input?.value ? Number(input.value) : NaN;
  if (!Number.isNaN(value)) {
    return value;
  }
  const text = tile.textContent ?? "";
  const match = text.match(/quantity is (\d+)/i);
  return match ? Number(match[1]) : 1;
};

const setTrolleyQuantity = async (productId: string, quantity: number) => {
  const tile = findProductTileById(productId);
  if (!tile) {
    throw new Error("Product not found on page.");
  }
  if (quantity < 0) {
    throw new Error("Quantity must be 0 or greater.");
  }
  const current = getTileQuantity(tile);
  if (current === 0) {
    await addToTrolley(productId);
  }
  let updated = getTileQuantity(tile);
  const increaseButton = tile.querySelector<HTMLButtonElement>(
    'button[aria-label^="Increase "]'
  );
  const decreaseButton = tile.querySelector<HTMLButtonElement>(
    'button[aria-label^="Decrease "]'
  );
  if (!increaseButton || !decreaseButton) {
    throw new Error("Quantity controls not found.");
  }

  while (updated < quantity) {
    increaseButton.click();
    await sleep(120);
    updated = getTileQuantity(tile);
  }
  while (updated > quantity) {
    decreaseButton.click();
    await sleep(120);
    updated = getTileQuantity(tile);
  }
  return { productId, quantity: updated };
};

const openTrolleyDialog = async () => {
  const trolleyButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => {
    const label = button.getAttribute("aria-label") ?? "";
    const text = button.textContent ?? "";
    return (
      normalizeText(label).includes("trolley and checkout") ||
      normalizeText(text).includes("trolley and checkout")
    );
  });
  if (!trolleyButton) {
    throw new Error("Trolley button not found.");
  }
  trolleyButton.click();
  await waitForCondition(
    () =>
      Boolean(
        document.querySelector('[role="dialog"] h2') ||
          document.querySelector('[role="dialog"]')
      ),
    TIMEOUT_MS
  );
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  if (!dialog) {
    throw new Error("Trolley dialog not found.");
  }
  return dialog;
};

const extractTrolleyItems = (dialog: HTMLElement): TrolleyItem[] => {
  const items: TrolleyItem[] = [];
  const listItems = Array.from(
    dialog.querySelectorAll<HTMLElement>('[role="listitem"], li')
  );

  for (const item of listItems) {
    const heading =
      item.querySelector<HTMLElement>("h4, h3") ??
      item.querySelector<HTMLElement>('[data-testid*="product-name"]');
    const name = heading?.textContent?.trim() ?? "";
    if (!name) {
      continue;
    }
    const quantityInput = item.querySelector<HTMLInputElement>(
      'input[role="spinbutton"]'
    );
    const quantity = quantityInput?.value
      ? Number(quantityInput.value)
      : parseQuantity(item.textContent);
    const text = item.textContent ?? "";
    const price = extractPrice(text);
    items.push({
      name,
      quantity: Number.isNaN(quantity) ? 1 : quantity,
      price,
    });
  }
  return items;
};

const parseQuantity = (text: string | null) => {
  if (!text) {
    return 1;
  }
  const match = text.match(/quantity(?: is)?\s*(\d+)/i);
  return match ? Number(match[1]) : 1;
};

const extractTrolleyTotal = (dialog: HTMLElement) => {
  const totalHeading = Array.from(
    dialog.querySelectorAll<HTMLElement>("h3, h4, span, div")
  ).find((el) => normalizeText(el.textContent ?? "") === "trolley total");
  if (!totalHeading) {
    return undefined;
  }
  const container = totalHeading.parentElement;
  if (!container) {
    return undefined;
  }
  const price = extractPrice(container.textContent ?? "");
  return price;
};

const getTrolley = async () => {
  const dialog = await openTrolleyDialog();
  const items = extractTrolleyItems(dialog);
  const total = extractTrolleyTotal(dialog);
  return { items, total };
};

const clearTrolley = async () => {
  const dialog = await openTrolleyDialog();
  const clearButton = Array.from(
    dialog.querySelectorAll<HTMLButtonElement>("button")
  ).find(
    (button) => normalizeText(button.textContent ?? "") === "remove all items"
  );
  if (!clearButton) {
    throw new Error("Remove all items button not found.");
  }
  clearButton.click();
  await sleep(300);
  return { cleared: true };
};

const removeFromTrolley = async (productId: string) => {
  const dialog = await openTrolleyDialog();
  const listItems = Array.from(
    dialog.querySelectorAll<HTMLElement>('[role="listitem"], li')
  );
  for (const item of listItems) {
    const text = item.textContent ?? "";
    if (productId.startsWith("name:")) {
      const name = productId.replace("name:", "");
      if (!text.includes(name)) {
        continue;
      }
    } else {
      const link = item.querySelector<HTMLAnchorElement>(
        `a[href="${CSS.escape(productId)}"]`
      );
      if (!link) {
        continue;
      }
    }

    const removeButton = Array.from(
      item.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => normalizeText(button.textContent ?? "") === "remove");
    if (!removeButton) {
      continue;
    }
    removeButton.click();
    await sleep(200);
    return { productId };
  }
  throw new Error("Product not found in trolley.");
};

const reviewOrder = async () => {
  const dialog = await openTrolleyDialog();
  const items = extractTrolleyItems(dialog);
  const total = extractTrolleyTotal(dialog);
  const checkoutButton = Array.from(
    dialog.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => normalizeText(button.textContent ?? "") === "checkout");
  return {
    items,
    total,
    checkoutEnabled: checkoutButton ? !checkoutButton.disabled : undefined,
  };
};

const getCategories = async () => {
  await ensureOnBrowsePage();
  await waitForSelector("a");
  const links = findNavCategories();
  const categories = uniqueTexts(
    links
      .map((link) => link.textContent ?? "")
      .map((text) => text.trim())
      .filter((text) => text && !CATEGORY_IGNORE.has(text))
  );
  return { categories };
};

const listSubcategories = async (categoryName: string) => {
  await openCategory(categoryName);
  await waitForSelector("main");
  const main = document.querySelector("main") ?? document.body;
  const links = Array.from(
    main.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/browse"], a[href*="/browse/"]'
    )
  );
  const subcategories = uniqueTexts(
    links
      .map((link) => link.textContent ?? "")
      .map((text) => text.trim())
      .filter(
        (text) => text && normalizeText(text) !== normalizeText(categoryName)
      )
  );
  return { categoryName, subcategories };
};

const listSubcategoryProducts = async (
  categoryName: string,
  subCategoryName: string,
  limit?: number,
  offset?: number
) => {
  await openSubcategory(categoryName, subCategoryName);
  await waitForSelector('button[aria-label^="Add "]');
  const products = extractProductsFromPage(limit, offset);
  return { categoryName, subCategoryName, products };
};

export const runCommand = <TCommand extends CommandName>(
  command: TCommand,
  params: RequestParams[TCommand]
): Promise<CommandResult[TCommand]> => {
  return commandHandlers[command](params);
};

export const commandHandlers: {
  [K in CommandName]: (params: RequestParams[K]) => Promise<CommandResult[K]>;
} = {
  get_categories: async () => await getCategories(),
  list_subcategories: async (p) => await listSubcategories(p.categoryName),
  list_subcategory_products: async (p) =>
    await listSubcategoryProducts(
      p.categoryName,
      p.subCategoryName,
      p.limit,
      p.offset
    ),
  search_products: async (p) =>
    await searchProducts(p.query, p.limit, p.offset),
  add_to_trolley: async (p) => await addToTrolley(p.productId),
  set_trolley_quantity: async (p) =>
    await setTrolleyQuantity(p.productId, p.quantity),
  get_trolley: async () => await getTrolley(),
  remove_from_trolley: async (p) => await removeFromTrolley(p.productId),
  clear_trolley: async () => await clearTrolley(),
  review_order: async () => await reviewOrder(),
};
