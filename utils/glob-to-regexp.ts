/**
 * Converts a glob pattern to a regular expression.
 * Handles question marks and escaping special characters.
 * Does not support globstars (`**`).
 */
export default function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = escaped
    .replace(/\\\*/g, '.*') // replace escaped `*` with `.*`
    .replace(/\\\?/g, '.') // replace escaped `?` with `.`
  return new RegExp(`^${regex}$`)
}
