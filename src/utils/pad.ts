
export default function pad(s: string, size: number) {
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}