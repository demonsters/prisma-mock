import pad from "../utils/pad"



// https://en.wikipedia.org/wiki/Universally_unique_identifier
const createUuid = () => {
  let uuid_cache = 0
  return () => {
    uuid_cache++
    return `123e4567-e89b-12d3-a456-${pad(String(uuid_cache), 12)}`;
  }
}

export default createUuid
