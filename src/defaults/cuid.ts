import pad from "../utils/pad"


// Format from: https://cuid.marcoonroad.dev/
const createCuid = () => {
  let ciud_cache = 0
  return () => {
    ciud_cache++
    return `c00p6qup2${pad(String(ciud_cache), 4)}ckkzslahp5pn`;
  }
}

export default createCuid
