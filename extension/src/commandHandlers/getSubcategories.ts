import { navigateTo } from "../colesDom";

export interface Subcategory {
  name: string;
  url: string;
}

export const getSubcategories = async (categoryUrl: string): Promise<Subcategory[]> => {
  await navigateTo(categoryUrl);
  const navList = document.querySelector('[data-testid="navigation-list"]');
  if (!navList) {
    throw new Error("Navigation list not found.");
  }
  const links = Array.from(navList.querySelectorAll<HTMLAnchorElement>('[data-testid="nav-link"]'));
  return links.map((link) => {
    return {
      name: link.textContent,
      url: link.href,
    };
  });
};
