# Make a language pack

[简体中文](zh-CN/LANGUAGE-PACKS.md)

1. Open Settings → Language and privacy → Export language template.
2. Set `locale` to a custom ID such as `x-fr-fr`, and `name` to its native display name.
3. Translate the values in `messages`, keeping their stable keys and all numbered placeholders such as `{0}`. Do not translate keys. You may remove entries you have not translated; they fall back to English.
4. Save as UTF-8 JSON, import it, review the confirmation and select it in the language menu. Importing replaces the single custom-pack slot; export or retain your source file first.

```json
{
  "format": "amber-language",
  "schema": 1,
  "locale": "x-fr-fr",
  "name": "Français",
  "messages": {"m311bb313fdec": "Comptes"}
}
```

Files must be regular JSON files up to 2 MB. IDs match `x-[a-z0-9-]{2,32}`. Names are 1–60 characters; entries are at most 8,000 characters. Unknown message keys, mismatched placeholders, prohibited control characters and bidi override controls are rejected. Import never executes code or changes URLs, paths, permissions or download sources. HTML is rendered as text, not markup. Built-in Chinese and English cannot be replaced. The custom pack is stored in AMBER's local user-data directory, separate from game data.

Use only trusted packs: wording can still mislead even without executable code. The interface currently uses left-to-right layout. Native operating-system UI and the NSIS installer offer their supported languages independently; custom packs cover AMBER UI and application dialog messages. When upgrading, keep a copy of your source pack, export a new template and merge translations for changed keys. Stable unchanged messages retain their keys.

Catalog source: `prototype/desktop/locales/catalog.json`. Each entry has Chinese and English text. Keys are stable identifiers derived from the source message. Add entries for new messages and preserve placeholder parity; tests validate the complete catalog. Pair user-guide changes in both languages.

The optional `formatLocale` controls date and number formatting. Use a valid BCP 47 locale, such as `fr-FR`; the default is `en-US`.
