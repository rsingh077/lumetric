/**
 * Lumetric High-Performance Data Profiler Web Worker
 * Offloads RFC 4180 CSV/TSV parsing, row healing, and multi-column statistical profiling
 * from the main UI thread to prevent UI freezing on large datasets (10,000+ rows).
 */

self.onmessage = function (e) {
  const { id, action, payload } = e.data;

  try {
    if (action === 'PARSE_AND_PROFILE') {
      const result = executeParseAndProfile(payload.text, payload.options || {});
      self.postMessage({ id, success: true, result });
    } else if (action === 'PROFILE_ROWS') {
      const result = executeProfileRows(payload.rows, payload.headers, payload.options || {});
      self.postMessage({ id, success: true, result });
    } else {
      throw new Error(`Unsupported worker action: ${action}`);
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message || String(err) });
  }
};

function parseNumeric(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  var str = String(raw).trim();
  if (str === '' || /^(na|n\/a|null|nan|none|-|--)$/i.test(str)) return null;

  var isParenNegative = /^\(.*\)$/.test(str);
  var isPercent = str.endsWith('%');

  var cleaned = str.replace(/[\$,€£¥₹\s\(\)"]/g, '');
  if (isPercent) cleaned = cleaned.replace(/%/g, '');

  var parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;

  var finalVal = isParenNegative ? -Math.abs(parsed) : parsed;
  if (isPercent) finalVal = finalVal / 100;
  return finalVal;
}

function parseCSVStrict(text, customDelimiter) {
  if (!text || text.length === 0) return [];

  var delimiter = customDelimiter;
  if (!delimiter) {
    var firstChunk = text.slice(0, 2000);
    var commaCount = (firstChunk.match(/,/g) || []).length;
    var tabCount = (firstChunk.match(/\t/g) || []).length;
    var semiCount = (firstChunk.match(/;/g) || []).length;
    if (tabCount > commaCount && tabCount > semiCount) {
      delimiter = '\t';
    } else if (semiCount > commaCount && semiCount > tabCount) {
      delimiter = ';';
    } else {
      delimiter = ',';
    }
  }

  var rows = [];
  var currentRow = [];
  var currentField = '';
  var inQuotes = false;
  var i = 0;
  var len = text.length;

  while (i < len) {
    var char = text[i];
    var nextChar = i + 1 < len ? text[i + 1] : '';

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (!inQuotes) {
      if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }
      if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(function (c) { return c.length > 0; })) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i += 2;
        continue;
      }
      if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some(function (c) { return c.length > 0; })) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      }
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(function (c) { return c.length > 0; })) {
      rows.push(currentRow);
    }
  }

  return { rows: rows, detectedDelimiter: delimiter };
}

function healDatasetRows(rows) {
  if (!rows || rows.length === 0) return [];
  var totalCols = Object.keys(rows[0] || {}).length;
  if (totalCols <= 3) return rows;

  return rows.filter(function (row) {
    var populated = Object.values(row).filter(function (v) {
      return v !== '' && v !== null && v !== undefined;
    });
    if (populated.length === 0) return false;

    if (populated.length <= Math.max(1, Math.floor(totalCols * 0.25))) {
      var hasId = Object.entries(row).some(function (pair) {
        var k = pair[0];
        var v = pair[1];
        if (/id|key|code|account|order|trans/i.test(k) && String(v).trim().length > 0) return true;
        return false;
      });
      if (!hasId) return false;
    }

    return true;
  });
}

function executeParseAndProfile(text, options) {
  var parseRes = parseCSVStrict(text, options.delimiter);
  var rawGrid = parseRes.rows;
  if (!rawGrid || rawGrid.length < 2) {
    throw new Error('Dataset must contain at least a header row and one valid data record.');
  }

  var rawHeaders = rawGrid[0].map(function (h, i) {
    var trimmed = String(h || '').trim();
    return trimmed.length > 0 ? trimmed : 'col_' + (i + 1);
  });

  // Disambiguate duplicate header names
  var seenHeaders = {};
  var headers = rawHeaders.map(function (h) {
    if (seenHeaders[h]) {
      seenHeaders[h]++;
      return h + '_' + seenHeaders[h];
    }
    seenHeaders[h] = 1;
    return h;
  });

  var rows = [];
  for (var r = 1; r < rawGrid.length; r++) {
    var rowArr = rawGrid[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = rowArr[c] !== undefined ? String(rowArr[c]).trim() : '';
    }
    rows.push(obj);
  }

  rows = healDatasetRows(rows);
  var profileResult = executeProfileRows(rows, headers, options);

  return {
    headers: headers,
    rows: rows,
    rowCount: rows.length,
    detectedDelimiter: parseRes.detectedDelimiter,
    columns: profileResult.columns,
    suggestedPrimaryKey: profileResult.suggestedPrimaryKey,
    suggestedTimestamp: profileResult.suggestedTimestamp,
  };
}

function executeProfileRows(rows, headers, options) {
  var columnRoles = options.columnRoles || {};
  var suggestedPrimaryKey = '';
  var suggestedTimestamp = '';

  var columns = headers.map(function (colName) {
    var values = rows.map(function (r) { return r[colName] ?? ''; });
    var nullCount = values.filter(function (v) {
      return v === '' || v.toLowerCase() === 'null' || v.toLowerCase() === 'nan';
    }).length;

    var nonNulls = values.filter(function (v) {
      return v !== '' && v.toLowerCase() !== 'null';
    });

    var uniqueSet = new Set(nonNulls);
    var uniqueCount = uniqueSet.size;
    var sampleValues = Array.from(uniqueSet).slice(0, 5);

    var numericValues = [];
    for (var n = 0; n < nonNulls.length; n++) {
      var parsed = parseNumeric(nonNulls[n]);
      if (parsed !== null && !isNaN(parsed)) {
        numericValues.push(parsed);
      }
    }

    var isNumeric = numericValues.length >= nonNulls.length * 0.7 && nonNulls.length > 0;
    var isDate = nonNulls.length > 0 && nonNulls.slice(0, 50).every(function (v) {
      return !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/'));
    });
    var isBoolean = nonNulls.length > 0 && nonNulls.every(function (v) {
      return ['true', 'false', '0', '1'].includes(v.toLowerCase());
    });

    var inferredType = 'string';
    var stats = {};

    if (isBoolean) {
      inferredType = 'boolean';
    } else if (isNumeric) {
      var isInt = numericValues.every(function (num) { return Number.isInteger(num); });
      inferredType = isInt ? 'integer' : 'float';

      var sorted = numericValues.slice().sort(function (a, b) { return a - b; });
      var sum = 0;
      for (var s = 0; s < sorted.length; s++) sum += sorted[s];
      var mean = sum / sorted.length;
      var median = sorted[Math.floor(sorted.length / 2)];
      var min = sorted[0];
      var max = sorted[sorted.length - 1];

      var varianceSum = 0;
      for (var v = 0; v < sorted.length; v++) {
        varianceSum += Math.pow(sorted[v] - mean, 2);
      }
      var variance = varianceSum / sorted.length;
      var stdDev = Math.sqrt(variance);

      stats = {
        min: min,
        max: max,
        mean: Number(mean.toFixed(2)),
        median: median,
        stdDev: Number(stdDev.toFixed(2))
      };
    } else if (isDate) {
      inferredType = 'date';
      var sortedDates = nonNulls.slice().sort();
      stats = {
        earliestDate: sortedDates[0],
        latestDate: sortedDates[sortedDates.length - 1]
      };
    } else {
      var lengths = nonNulls.map(function (v) { return v.length; });
      stats = {
        minLength: lengths.length > 0 ? Math.min.apply(null, lengths) : 0,
        maxLength: lengths.length > 0 ? Math.max.apply(null, lengths) : 0
      };
    }

    // Role heuristic
    var role = columnRoles[colName];
    if (!role) {
      if (uniqueCount === rows.length && /id|key|code|uuid|guid/i.test(colName)) {
        role = 'identifier';
      } else if (inferredType === 'date' || /date|time|timestamp|period|month|year/i.test(colName)) {
        role = 'temporal';
      } else if (inferredType === 'integer' || inferredType === 'float') {
        role = 'metric';
      } else {
        role = 'dimension';
      }
    }

    if (role === 'identifier' && !suggestedPrimaryKey) {
      suggestedPrimaryKey = colName;
    }
    if (role === 'temporal' && !suggestedTimestamp) {
      suggestedTimestamp = colName;
    }

    return Object.assign({
      name: colName,
      inferredType: inferredType,
      semanticRole: role,
      totalCount: values.length,
      nullCount: nullCount,
      uniqueCount: uniqueCount,
      sampleValues: sampleValues
    }, stats);
  });

  if (!suggestedPrimaryKey) {
    var idCand = columns.find(function (c) { return c.semanticRole === 'identifier'; });
    suggestedPrimaryKey = idCand ? idCand.name : (headers[0] || 'id');
  }

  return {
    columns: columns,
    suggestedPrimaryKey: suggestedPrimaryKey,
    suggestedTimestamp: suggestedTimestamp
  };
}
