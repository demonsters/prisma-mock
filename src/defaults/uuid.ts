import pad from "../utils/pad"

let uuid_cache = 0


// https://en.wikipedia.org/wiki/Universally_unique_identifier
const Uuid = () => {
  uuid_cache++
  return `123e4567-e89b-12d3-a456-${pad(String(uuid_cache), 12)}`;
}

export function ResetUuid() {
  uuid_cache = 0
}

export default Uuid
