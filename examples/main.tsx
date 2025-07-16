import React from 'react';
import ReactDOM from 'react-dom';
import BBoxAnnotator, { EntryType } from 'react-bbox-annotator';

// Load all CSV files under the data directory
const csvFiles: Record<string, string> = import.meta.glob('./data/**/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
});
// Load images so they can be referenced by name
const imageFiles: Record<string, string> = import.meta.glob(
  './data/**/images/*.{png,jpg,jpeg}',
  { query: '?url', import: 'default', eager: true }
);

type Dataset = {
  name: string;
  dir: string;
  imageFiles: string[];
  annotations: Record<string, EntryType[]>;
  imageUrls: Record<string, string>;
  labels: string[];
};

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift()?.split(',') || [];
  const idx = {
    image: header.indexOf('image_filename'),
    label: header.indexOf('label'),
    x1: header.indexOf('x1'),
    y1: header.indexOf('y1'),
    x2: header.indexOf('x2'),
    y2: header.indexOf('y2'),
  };
  const data: Record<string, EntryType[]> = {};
  const labelSet = new Set<string>();
  lines.forEach((line) => {
    const cols = line.split(',');
    const file = cols[idx.image];
    const label = cols[idx.label];
    const x1 = parseFloat(cols[idx.x1]);
    const y1 = parseFloat(cols[idx.y1]);
    const x2 = parseFloat(cols[idx.x2]);
    const y2 = parseFloat(cols[idx.y2]);
    const entry: EntryType = {
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
      label,
    };
    labelSet.add(label);
    if (!data[file]) data[file] = [];
    data[file].push(entry);
  });
  return { data, labels: Array.from(labelSet) };
}

function exportCoco(ds: Dataset) {
  const images: any[] = [];
  const annotations: any[] = [];
  const labelMap = new Map<string, number>();
  let annId = 1;
  ds.imageFiles.forEach((file, i) => {
    images.push({ id: i + 1, file_name: file });
    const boxes = ds.annotations[file] || [];
    boxes.forEach((b) => {
      if (!labelMap.has(b.label)) {
        labelMap.set(b.label, labelMap.size + 1);
      }
      annotations.push({
        id: annId++,
        image_id: i + 1,
        category_id: labelMap.get(b.label),
        bbox: [b.left, b.top, b.width, b.height],
        area: b.width * b.height,
        iscrowd: 0,
      });
    });
  });
  const categories = Array.from(labelMap.entries()).map(([name, id]) => ({
    id,
    name,
  }));
  const coco = { images, annotations, categories };
  const blob = new Blob([JSON.stringify(coco, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = ds.name.replace(/\.csv$/, '.json');
  link.click();
  URL.revokeObjectURL(link.href);
}

const datasetPaths = Object.keys(csvFiles);

const ExampleReview: React.FC = () => {
  const [path, setPath] = React.useState<string>('');
  const [dataset, setDataset] = React.useState<Dataset | null>(null);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (!path) return;
    const csvText = csvFiles[path];
    const { data, labels } = parseCsv(csvText);
    const dir = path.substring(0, path.lastIndexOf('/'));
    const files = Object.keys(data).sort();
    const imageUrls: Record<string, string> = {};
    files.forEach((f) => {
      const imgPath = `${dir}/images/${f}`;
      if (imageFiles[imgPath]) imageUrls[f] = imageFiles[imgPath];
    });
    setDataset({
      name: path.replace('./data/', ''),
      dir,
      imageFiles: files,
      annotations: data,
      imageUrls,
      labels,
    });
    setIndex(0);
  }, [path]);

  if (!dataset) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Select CSV file</h3>
        <select value={path} onChange={(e) => setPath(e.target.value)}>
          <option value="">Choose one...</option>
          {datasetPaths.map((p) => (
            <option key={p} value={p}>
              {p.replace('./data/', '')}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const file = dataset.imageFiles[index];
  const url = dataset.imageUrls[file];
  const entries = dataset.annotations[file] || [];
  const prev = () => setIndex((i) => Math.max(i - 1, 0));
  const next = () =>
    setIndex((i) => Math.min(i + 1, dataset.imageFiles.length - 1));
  const update = (e: EntryType[]) => {
    setDataset((d) =>
      d ? { ...d, annotations: { ...d.annotations, [file]: e } } : d
    );
  };

  return (
    <div style={{ width: '80%', margin: '0 auto' }}>
      <div style={{ marginBottom: 10 }}>
        <button onClick={prev} disabled={index === 0}>
          Prev
        </button>
        <span style={{ margin: '0 10px' }}>
          {file} ({index + 1}/{dataset.imageFiles.length})
        </span>
        <button
          onClick={next}
          disabled={index === dataset.imageFiles.length - 1}
        >
          Next
        </button>
        <button style={{ float: 'right' }} onClick={() => exportCoco(dataset)}>
          Save COCO
        </button>
      </div>
      <BBoxAnnotator
        key={file}
        url={url}
        inputMethod="text"
        labels={dataset.labels}
        initialEntries={entries}
        onChange={update}
      />
    </div>
  );
};

const App: React.FC = () => <ExampleReview />;

ReactDOM.render(<App />, document.getElementById('root'));
