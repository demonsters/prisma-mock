import pad from "../utils/pad"

let ciud_cache = 0

// Format from: https://cuid.marcoonroad.dev/
const Cuid = () => {
  ciud_cache++
  return `c00p6qup2${pad(String(ciud_cache), 4)}ckkzslahp5pn`;
}

export function ResetCuid() {
  ciud_cache = 0
}

export default Cuid
