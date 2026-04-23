const fs = require('fs');
const f = 'C:\\Users\\jbint\\parawaze-shuttle\\src\\app\\map\\page.tsx';
let c = fs.readFileSync(f, 'utf8');

// Add useSearchParams import if not present
if (!c.includes('useSearchParams')) {
  c = c.replace(
    "import { useRouter } from 'next/navigation';",
    "import { useRouter, useSearchParams } from 'next/navigation';"
  );
}

// Add lite mode detection after router
const routerLine = "const router = useRouter();";
const liteModeLine = `const router = useRouter();
  const searchParams = useSearchParams();
  const liteMode = searchParams.get('lite') === 'true';`;
c = c.replace(routerLine, liteModeLine);

// Wrap all the heavy hooks in lite mode guards
// Find the stationsEnabled state and add lite mode guard
c = c.replace(
  "const [stationsEnabled, setStationsEnabled] = useState(false);",
  "const [stationsEnabled, setStationsEnabled] = useState(false);\n\n  // LITE MODE: skip all data loading for diagnosis\n  const skipData = liteMode;"
);

// Guard the auto-enable stations timer
c = c.replace(
  "const t = setTimeout(() => {\n      setStationsEnabled(true);\n      setStationsReady(true);\n    }, 5000);",
  "if (skipData) return;\n    const t = setTimeout(() => {\n      setStationsEnabled(true);\n      setStationsReady(true);\n    }, 5000);"
);

// Guard fetchShuttles
c = c.replace(
  /useEffect\(\(\) => \{\s*fetchShuttles\(\);/,
  "useEffect(() => {\n    if (skipData) return;\n    fetchShuttles();"
);

// Guard the day filter fetch
c = c.replace(
  /useEffect\(\(\) => \{\s*fetchReportsByDay/,
  "useEffect(() => {\n    if (skipData) return;\n    fetchReportsByDay"
);

// Guard fetchPois
if (c.includes('fetchPois();')) {
  c = c.replace(
    /useEffect\(\(\) => \{\s*fetchPois\(\);/,
    "useEffect(() => {\n    if (skipData) return;\n    fetchPois();"
  );
}

fs.writeFileSync(f, c);
console.log('Lite mode added');
