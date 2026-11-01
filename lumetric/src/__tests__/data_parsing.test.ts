import { parseCSVStrict, healDatasetRows, parseNumeric } from '@/lib/csvParser';
import { parseAndProfileDatasetAsync } from '@/lib/workerProfiler';

describe('Data Ingestion & CSV Profiling Pipeline', () => {
  test('parseCSVStrict handles valid CSV with quotes and commas', () => {
    const csv = `id,name,revenue,region\n1,"Acme, Inc.",50000,Americas\n2,"Globex Corp",75000,EMEA`;
    const rows = parseCSVStrict(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1][1]).toBe('Acme, Inc.');
    expect(rows[1][0]).toBe('1');
    expect(rows[2][2]).toBe('75000');
  });

  test('healDatasetRows preserves populated records and drops empty fragments', () => {
    const rawRows = [
      { id: '1', name: 'Acme', rev: '100', region: 'Americas', active: 'true' },
      { id: '', name: '', rev: '', region: '', active: '' }, // empty row
    ];
    const healed = healDatasetRows(rawRows);
    expect(healed.length).toBe(1);
    expect(healed[0].name).toBe('Acme');
  });

  test('parseNumeric handles currencies, percentages, and commas', () => {
    expect(parseNumeric('$1,234.56')).toBe(1234.56);
    expect(parseNumeric('45.5%')).toBe(0.455);
    expect(parseNumeric('100')).toBe(100);
    expect(parseNumeric('invalid')).toBeNull();
    expect(parseNumeric('')).toBeNull();
  });

  test('parseAndProfileDatasetAsync computes column types, null counts, and cardinality', async () => {
    const csv = `id,age,country\n1,25,USA\n2,30,India\n3,,USA`;
    const profile = await parseAndProfileDatasetAsync(csv);
    expect(profile.rowCount).toBe(3);
    expect(profile.columns).toHaveLength(3);

    const countryCol = profile.columns.find((c) => c.name === 'country');
    expect(countryCol).toBeDefined();
    expect(countryCol?.semanticRole).toBe('dimension');

    const ageCol = profile.columns.find((c) => c.name === 'age');
    expect(ageCol).toBeDefined();
    expect(ageCol?.nullCount).toBe(1);
  });
});
