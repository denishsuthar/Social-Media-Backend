import slugify from "slugify";

export function generateUsername(name) {
  const slug = slugify(name, { lower: true, replacement: '_' });
  return slug;
}

export function generateUniqueUsername(name, counter) {
  const slug = slugify(name, { lower: true, replacement: '_' });
  return `${slug}_${counter}`;
}