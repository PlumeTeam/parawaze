const fs = require('fs');
const f = 'C:\\Users\\jbint\\parawaze-shuttle\\src\\app\\map\\page.tsx';
let c = fs.readFileSync(f, 'utf8');

const oldBtn = `        <button
          onClick={() => mapActionsRef.current?.cycleStyle()}`;

const newBtn = `        <button
          onClick={toggleStations}
          className={\`\${stationsEnabled ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-gray-700 border-gray-100'} rounded-xl shadow-lg p-2.5 transition-colors border\`}
          title={stationsEnabled ? 'Masquer les balises' : 'Afficher les balises'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>
        <button
          onClick={() => mapActionsRef.current?.cycleStyle()}`;

c = c.replace(oldBtn, newBtn);
fs.writeFileSync(f, c);
console.log('Done');
