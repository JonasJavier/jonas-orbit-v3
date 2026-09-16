/** Small editorial reference thumbnails. No player, API key or runtime fetch. */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const selections = [
  {
    id: "zimmer",
    group: "music",
    title: "Hans Zimmer",
    note: "Música de cine",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/2/2b/Hans-Zimmer-profile.jpg",
    page: "https://commons.wikimedia.org/wiki/File:Hans-Zimmer-profile.jpg",
    alt: "Retrato de Hans Zimmer por ColliderVideo",
    credit: "ColliderVideo · CC BY 3.0 · recorte y tamaño adaptados",
    license: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "beach-house",
    group: "music",
    title: "Beach House",
    note: "Myth",
    term: "Beach House Myth",
    entity: "song",
    artist: "Beach House",
  },
  {
    id: "iris",
    group: "music",
    title: "Goo Goo Dolls",
    note: "Iris",
    term: "Goo Goo Dolls Iris",
    entity: "song",
    artist: "The Goo Goo Dolls",
  },
  {
    id: "kodaline",
    group: "music",
    title: "Kodaline",
    note: "All I Want",
    term: "Kodaline All I Want",
    entity: "song",
    artist: "Kodaline",
  },
  {
    id: "interstellar",
    group: "stories",
    title: "Interstellar",
    note: "Cine",
    page: "https://tv.apple.com/us/movie/interstellar/umc.cmc.1vrwat5k1ucm5k42q97ioqyq3",
  },
  {
    id: "arrival",
    group: "stories",
    title: "Arrival",
    note: "Cine",
    page: "https://tv.apple.com/us/movie/arrival/umc.cmc.20sgkdxqbvucopzt913joa0gr",
  },
  {
    id: "smallville",
    group: "stories",
    title: "Smallville",
    note: "Mi serie favorita",
    term: "Smallville",
    entity: "tvSeason",
    artist: "Smallville",
    country: "gb",
  },
  {
    id: "dark",
    group: "stories",
    title: "Dark",
    note: "Serie",
    page: "https://www.netflix.com/title/80100172",
  },
  {
    id: "vinland-saga",
    group: "stories",
    title: "Vinland Saga",
    note: "Anime",
    term: "Vinland Saga",
    entity: "tvSeason",
    artist: "Vinland Saga",
  },
  {
    id: "narvent",
    group: "music",
    title: "Narvent",
    note: "Synthwave",
    term: "Narvent",
    entity: "album",
    artist: "Narvent",
  },
  {
    id: "imagine-dragons",
    group: "music",
    title: "Imagine Dragons",
    note: "Energía",
    term: "Imagine Dragons",
    entity: "album",
    artist: "Imagine Dragons",
  },
  {
    id: "coldplay",
    group: "music",
    title: "Coldplay",
    note: "Para acompañar el día",
    term: "Coldplay",
    entity: "album",
    artist: "Coldplay",
  },
  {
    id: "aurora",
    group: "music",
    title: "AURORA",
    note: "Voces y atmósferas",
    term: "AURORA All My Demons",
    entity: "album",
    artist: "AURORA",
  },
  {
    id: "tom-odell",
    group: "music",
    title: "Tom Odell",
    note: "Piano y canciones",
    term: "Tom Odell",
    entity: "album",
    artist: "Tom Odell",
  },
  {
    id: "cigarettes",
    group: "music",
    title: "Cigarettes After Sex",
    note: "Para bajar el ritmo",
    term: "Cigarettes After Sex",
    entity: "album",
    artist: "Cigarettes After Sex",
  },
  {
    id: "dark-knight",
    group: "stories",
    title: "The Dark Knight",
    note: "Cine",
    page: "https://tv.apple.com/us/movie/the-dark-knight/umc.cmc.1uf4c3neuc9yxhnjv7t4rd5wa",
  },
  {
    id: "fight-club",
    group: "stories",
    title: "Fight Club",
    note: "Cine",
    page: "https://tv.apple.com/us/movie/fight-club/umc.cmc.70dbl3043tb6ealg0u12k1pih",
  },
  {
    id: "inception",
    group: "stories",
    title: "Inception",
    note: "Cine",
    page: "https://tv.apple.com/us/movie/inception/umc.cmc.6loas01ow0w4lkatxxloz7a6e",
  },
  {
    id: "hunter",
    group: "stories",
    title: "Hunter × Hunter",
    note: "Anime",
    page: "https://tv.apple.com/us/show/hunter-x-hunter/umc.cmc.6iubybdmze8hzxhis7q2gzmk3",
  },
  {
    id: "psycho-pass",
    group: "stories",
    title: "Psycho-Pass",
    note: "Anime",
    page: "https://tv.apple.com/us/show/psycho-pass/umc.cmc.3qwxh4omq5kfkgmu3mdo3jxr",
  },
  {
    id: "violet",
    group: "stories",
    title: "Violet Evergarden",
    note: "Anime",
    page: "https://tv.apple.com/us/show/violet-evergarden/umc.cmc.6bdplgvm5joh2yzm9w6ujooqe",
  },
];
const destination = "public/images/sobre-mi/gustos";
await mkdir(destination, { recursive: true });
const manifest = [];
for (const item of selections) {
  let image, source, artworkTitle;
  if (item.image) {
    image = item.image;
    source = item.page;
    artworkTitle = item.title;
  } else if (item.page) {
    const response = await fetch(item.page);
    if (!response.ok) throw Error(`${item.id}: ${response.status}`);
    const html = await response.text();
    image = html.match(/<meta[^>]*property="og:image" content="([^"]+)"/)?.[1];
    source = item.page;
    artworkTitle = item.title;
  } else {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(item.term)}&entity=${item.entity}&limit=5&country=${item.country ?? "us"}`;
    const response = await fetch(url);
    if (!response.ok) throw Error(`${item.id}: ${response.status}`);
    const { results } = await response.json();
    const record = results.find((result) => result.artistName === item.artist);
    if (!record) throw Error(`No verified record for ${item.id}`);
    image = record.artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg");
    source = record.trackViewUrl ?? record.collectionViewUrl;
    artworkTitle = record.collectionName;
  }
  if (!image) throw Error(`No artwork for ${item.id}`);
  const response = await fetch(image);
  if (!response.ok) throw Error(`Artwork ${item.id}: ${response.status}`);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(`${destination}/${item.id}.webp`, data);
  manifest.push({
    id: item.id,
    group: item.group,
    title: item.title,
    note: item.note,
    src: `/images/sobre-mi/gustos/${item.id}.webp`,
    width: info.width,
    height: info.height,
    source,
    artworkTitle,
    originalImage: image,
    alt: item.alt ?? `Portada: ${artworkTitle}`,
    credit: item.credit ?? "",
    license: item.license ?? "",
  });
}
await writeFile(
  "content/about-tastes.data.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(`Prepared ${manifest.length} editorial thumbnails.`);
