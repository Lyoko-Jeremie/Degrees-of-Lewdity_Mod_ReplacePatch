
# ReplacePatch

---

this mod export addon:

`ReplacePatcher` : `ReplacePatcherAddon`

```json lines
{
  "addonPlugin": [
    {
      "modName": "ReplacePatcher",
      "addonName": "ReplacePatcherAddon",
      "modVersion": "1.0.0",
      "params": {
        "js": [
          {
            "from": "<span>Widgets:</span>",
            "to": "<span>小部件:</span>",
            "fileName": "debugMenu.js"
          }
        ],
        "css": [
          {
            "from": "<span>Widgets:</span>",
            "to": "<span>小部件:</span>",
            "fileName": "debugMenu.css"
          }
        ],
        "twee": [
          {
            "passageName": "Widgets Lower Clothing",
            "from": "<span>Widgets:</span>",
            "to": "<span>小部件:</span>"
          }
        ]
      }

    }
  ],
}
```
