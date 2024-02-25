import fs from "fs";

function readFile(fn: (line: string) => void): Promise<void> {
  let resolve: (value: void | PromiseLike<void>) => void;
  let str = "";
  const promise = new Promise<void>((_resolve) => {
    resolve = _resolve;
  });
  const highWaterMark = 512 * 512 * 1024;
  const readableStream = fs.createReadStream("./measurements.txt", {
    encoding: "utf8",
    highWaterMark,
  });

  let leftover = "";

  readableStream.on("data", (chunk) => {
    let data = leftover + chunk;
    const lines = data.split("\n");
    leftover = lines.pop() || "";

    lines.forEach((line) => {
      if (line) {
        fn(line);
      }
    });
  });

  readableStream.on("end", () => {
    resolve();
  });

  return promise;
}

function processTemp(temp: string): number {
  return Number(temp);
}

function processLine(line: string): [string, number] {
  const [city, temp] = line.split(";");
  return [city, processTemp(temp)];
}

function mean(count: Count, sum: Sum) {
  return Math.ceil(sum / count);
}

function formatStats(stats: Stats) {
  return `${stats[0]}/${mean(stats[2], stats[3])}/${stats[1]}/`;
}

function formatCity(city: City, stats: Stats) {
  return `${city}=${formatStats(stats)}`;
}

type Min = number;
type Max = number;
type Count = number;
type Sum = number;
type Stats = [Min, Max, Count, Sum];
type City = string;

const billion = 1_000_000_000;

async function main() {
  const stats = new Map<City, Stats>();
  let counter = 0;
  let pow = 0;
  let start = Date.now();
  await readFile((l) => {
    if (counter === Math.pow(10, pow)) {
      let end = Date.now();
      const seconds = (end - start) / 1000;
      const timeToBillion = (billion - counter) * (seconds / counter);
      const debugString = `
        Processed ${counter.toLocaleString(
          "en-US"
        )} lines in ${seconds.toFixed()}s.
        Time to 1 billion: ${timeToBillion.toFixed()}s
      `
        .split("\n")
        .map((s) => s.trim())
        .join("\n");
      console.log(debugString);
      pow++;
    }
    const [city, temp] = processLine(l);
    const current = stats.get(city) || [Infinity, -Infinity, 0, 0];
    const [min, max, count, sum] = current;
    // stats.set(city, [
    //   Math.min(min, temp),
    //   Math.max(max, temp),
    //   count + 1,
    //   sum + temp,
    // ]);
    counter++;
  });

  const sorted = Array.from(stats.keys()).sort();

  console.log(
    `{${sorted.map((city) => formatCity(city, stats.get(city)!)).join(",")}}`
  );
}

main();
