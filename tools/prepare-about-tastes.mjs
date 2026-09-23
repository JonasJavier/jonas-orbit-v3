/** Small editorial reference thumbnails. No player, API key or runtime fetch.
 *
 * Music: one album cover per artist, found through the iTunes Search API by
 * artist AND album name, so a search that reorders its results cannot swap
 * the cover. The page names only the artist (docs/design/sobre-mi-constelacion.md).
 * Stories: the 16:9 `og:image` of each title's Apple TV page.
 *
 * An entry already in the manifest, with its file present and the same
 * reference (album or page) and width, is kept as is; `--refresh` downloads
 * everything.
 * Selection order is display order: the owner's favourites go first. */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const music = (id, title, album, artist = title) => ({
  id,
  group: "music",
  title,
  album,
  artist,
});
const story = (id, title, note, page, work = title) => ({
  id,
  group: "stories",
  title,
  note,
  page,
  work,
});
const tv = "https://tv.apple.com/us";

const selections = [
  music("imagine-dragons", "Imagine Dragons", "Evolve"),
  music(
    "zimmer",
    "Hans Zimmer",
    "The World of Hans Zimmer - A Symphonic Celebration (Live)",
  ),
  music("jose-luis-perales", "José Luis Perales", "Canciones de un Poeta"),
  music("beach-house", "Beach House", "Bloom"),
  music("ed-sheeran", "Ed Sheeran", "÷ (Deluxe)"),
  music("of-monsters-and-men", "Of Monsters and Men", "My Head Is an Animal"),
  music("coldplay", "Coldplay", "Parachutes"),
  music("julio-iglesias", "Julio Iglesias", "Hey!"),
  music("snow-patrol", "Snow Patrol", "Eyes Open"),
  music("aurora", "AURORA", "All My Demons Greeting Me as a Friend (Deluxe)"),
  music("m83", "M83", "Hurry Up, We're Dreaming"),
  music("camilo-sesto", "Camilo Sesto", "Más y Más"),
  music("daughter", "Daughter", "If You Leave"),
  music("kodaline", "Kodaline", "In a Perfect World (Expanded Edition)"),
  music(
    "goo-goo-dolls",
    "Goo Goo Dolls",
    "Dizzy Up the Girl",
    "The Goo Goo Dolls",
  ),
  music("tom-odell", "Tom Odell", "Another Love (Zwette Edit) - Single"),
  music("cigarettes", "Cigarettes After Sex", "K. - Single"),
  music("narvent", "Narvent", "Fade Into Darkness - Single"),
  story(
    "interstellar",
    "Interstellar",
    "Cine",
    `${tv}/movie/interstellar/umc.cmc.1vrwat5k1ucm5k42q97ioqyq3`,
  ),
  story(
    "marvel",
    "Marvel",
    "Cine",
    `${tv}/movie/avengers-endgame/umc.cmc.4ao9tm6b6rz4sy7yj5v13ltf8`,
    "Avengers: Endgame",
  ),
  story(
    "smallville",
    "Smallville",
    "Mi serie favorita",
    `${tv}/show/smallville/umc.cmc.3oxo773g0bf8tylw00pccrhqs`,
  ),
  story(
    "spider-man",
    "Spider-Man",
    "Cine",
    `${tv}/movie/spider-man-no-way-home/umc.cmc.2qf7xc5hds0m5jgx4roago580`,
    "Spider-Man: No Way Home",
  ),
  story(
    "dark-knight",
    "The Dark Knight",
    "Cine",
    `${tv}/movie/the-dark-knight/umc.cmc.1uf4c3neuc9yxhnjv7t4rd5wa`,
  ),
  story(
    "fullmetal-alchemist",
    "Fullmetal Alchemist",
    "Anime",
    `${tv}/show/fullmetal-alchemist-brotherhood/umc.cmc.310y4hb2lmauoi9ry4cqne0uh`,
    "Fullmetal Alchemist: Brotherhood",
  ),
  story(
    "inception",
    "Inception",
    "Cine",
    `${tv}/movie/inception/umc.cmc.6loas01ow0w4lkatxxloz7a6e`,
  ),
  story(
    "superman",
    "Superman",
    "Cine · Henry Cavill",
    `${tv}/movie/man-of-steel/umc.cmc.36b6ewbbntgyf4laoffukb9lb`,
    "Man of Steel",
  ),
  story(
    "lion-king",
    "El Rey León",
    "Disney",
    `${tv}/movie/the-lion-king/umc.cmc.hzw12vgjjoz0tf0jn5m0x8i4`,
    "The Lion King",
  ),
  story(
    "hunter",
    "Hunter × Hunter",
    "Anime",
    `${tv}/show/hunter-x-hunter/umc.cmc.6iubybdmze8hzxhis7q2gzmk3`,
  ),
  story(
    "shutter-island",
    "La isla siniestra",
    "Cine",
    `${tv}/movie/shutter-island/umc.cmc.1n432wlu275a0640043zypfsj`,
    "Shutter Island",
  ),
  story(
    "the-flash",
    "The Flash",
    "Serie · Grant Gustin",
    `${tv}/show/the-flash/umc.cmc.2urshcbgirl699xzm1uc6xxb4`,
  ),
  story(
    "arrival",
    "Arrival",
    "Cine",
    `${tv}/movie/arrival/umc.cmc.20sgkdxqbvucopzt913joa0gr`,
  ),
  story(
    "vinland-saga",
    "Vinland Saga",
    "Anime",
    `${tv}/show/vinland-saga/umc.cmc.75kwlmcy3q71rh62hzsmggnoy`,
  ),
  story(
    "ratatouille",
    "Ratatouille",
    "Pixar",
    `${tv}/movie/ratatouille/umc.cmc.2i8p6l6cpu6zxmcpqao7bs147`,
  ),
  story("dark", "Dark", "Serie", "https://www.netflix.com/title/80100172"),
  story(
    "gurren-lagann",
    "Gurren Lagann",
    "Anime",
    `${tv}/show/gurren-lagann/umc.cmc.5u07amca53qskaq7spok00fxh`,
  ),
  story(
    "violet",
    "Violet Evergarden",
    "Anime",
    `${tv}/show/violet-evergarden/umc.cmc.6bdplgvm5joh2yzm9w6ujooqe`,
  ),
];

const destination = "public/images/sobre-mi/gustos";
/** Covers show at ~200 px (music) and ~290 px (stories): enough for 2x. */
const widths = { music: 400, stories: 640 };
const manifestPath = "content/about-tastes.data.json";
const refresh = process.argv.includes("--refresh");
const previous = new Map(
  existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, "utf8")).map((item) => [
        item.id,
        item,
      ])
    : [],
);

async function locate(item) {
  if (item.page) {
    const response = await fetch(item.page);
    if (!response.ok) throw Error(`${item.id}: ${response.status}`);
    const html = await response.text();
    return {
      image: html.match(/<meta[^>]*property="og:image" content="([^"]+)"/)?.[1],
      source: item.page,
      artworkTitle: item.work,
    };
  }
  const term = encodeURIComponent(`${item.artist} ${item.album}`);
  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=album&limit=10&country=us`,
  );
  if (!response.ok) throw Error(`${item.id}: ${response.status}`);
  const { results } = await response.json();
  const record = results.find(
    (result) =>
      result.artistName === item.artist && result.collectionName === item.album,
  );
  if (!record) throw Error(`No verified record for ${item.id}`);
  return {
    image: record.artworkUrl100.replace("100x100bb.jpg", "400x400bb.jpg"),
    source: record.collectionViewUrl,
    artworkTitle: record.collectionName,
  };
}

await mkdir(destination, { recursive: true });
const manifest = [];
let downloaded = 0;
for (const item of selections) {
  const src = `/images/sobre-mi/gustos/${item.id}.webp`;
  const kept = previous.get(item.id);
  const reference = item.page ?? item.album;
  const same =
    kept &&
    (item.page ? kept.source === item.page : kept.artworkTitle === item.album);
  let entry;
  if (
    !refresh &&
    same &&
    Math.abs(kept.width - widths[item.group]) <= 2 &&
    existsSync(`public${src}`)
  ) {
    entry = kept;
  } else {
    const { image, source, artworkTitle } = await locate(item);
    if (!image) throw Error(`No artwork for ${item.id} (${reference})`);
    const response = await fetch(image);
    if (!response.ok) throw Error(`Artwork ${item.id}: ${response.status}`);
    const info = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: widths[item.group], withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`public${src}`);
    downloaded += 1;
    entry = {
      src,
      width: info.width,
      height: info.height,
      source,
      artworkTitle,
      originalImage: image,
      alt: `Portada: ${artworkTitle}`,
    };
  }
  manifest.push({
    id: item.id,
    group: item.group,
    title: item.title,
    ...(item.note ? { note: item.note } : {}),
    src,
    width: entry.width,
    height: entry.height,
    source: entry.source,
    artworkTitle: entry.artworkTitle,
    originalImage: entry.originalImage,
    alt: entry.alt,
  });
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Prepared ${manifest.length} editorial thumbnails (${downloaded} downloaded).`,
);
