# Project: MighTea Inventory Manager

## Architecture
The application is a web-based, static single-page application (SPA) optimized for local execution and static hosting (GitHub Pages/Cloudflare). It uses LocalStorage and optional Firestore for persistence. The architecture separates structural markup, presentation styling, application logic, and data.

### Component Boundaries
- **index.html**: Structural layout adhering to classic Windows Vista dialogues.
- **styles/vista.css**: Custom styles implementing the Win32/Vista alternate visual styles (client edge 3D, bottom chin, title banner, grab handles, menu bars, tooltips, dialogs).
- **data/inventory.js**: The master inventory list structured by category.
- **data/categories.js**: The par levels and categories configuration.
- **js/app.js**: Core application state, event handlers, local storage management, import/export, and Firestore syncing logic.
- **backup.ps1**: PowerShell script utilizing `makecab.exe` to create `.CAB` archives and append changes to the master ledger.
- **ledger.md**: Master ledger of changes.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Data & File Modularization | Extract data, CSS, and JS into separate files and verify application stability | None | PLANNED |
| M2 | Vista Legacy UI Styling | Implement native Win32/WinForms Vista styling, custom tooltips, About/Help/Settings dialogs, and menu bar | M1 | PLANNED |
| M3 | PowerShell CAB Backup & Ledger | Implement `backup.ps1` script to package files using makecab and log version details in `ledger.md` | None | PLANNED |
| M4 | E2E Testing & Acceptance | Implement E2E test suite (Tiers 1-4) and verify the final application | M2, M3 | PLANNED |

## Code Layout
- `Z:\MighTea-InventoryManager\index.html` - Main application page
- `Z:\MighTea-InventoryManager\styles\vista.css` - Stylesheet for Vista styling
- `Z:\MighTea-InventoryManager\data\inventory.js` - Master inventory list
- `Z:\MighTea-InventoryManager\data\categories.js` - Par levels configuration
- `Z:\MighTea-InventoryManager\js\app.js` - Main JavaScript logic
- `Z:\MighTea-InventoryManager\backup.ps1` - PowerShell backup script
- `Z:\MighTea-InventoryManager\ledger.md` - Master change ledger
- `Z:\MighTea-InventoryManager\tests\` - Directory for E2E tests and test runner

## Interface Contracts
### Data Structures
- `window.inventoryData`: `{ "Category Name": ["Item 1", "Item 2"] }`
- `window.parLevels`: `{ "Item Name": parLevelNumber }`
- `window.appState`: `{ counts: { "item_id": count }, customItems: [{ id: "custom_id", name: "item name" }] }`
