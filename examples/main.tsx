import React from 'react';
import ReactDOM from 'react-dom';
import BBoxAnnotator, { EntryType } from 'react-bbox-annotator';

const ExampleSelect: React.FC = () => {
  const labels = ['Dog', 'Cat', 'Bird'];
  const [entries, setEntries] = React.useState<EntryType[]>([]);
  return (
    <div style={{ width: '60%', marginBottom: 20 }}>
      <h3>Select labels</h3>
      <BBoxAnnotator
        url="https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=800&q=80"
        inputMethod="select"
        labels={labels}
        onChange={setEntries}
      />
      <pre>{JSON.stringify(entries, null, 2)}</pre>
    </div>
  );
};

const ExampleText: React.FC = () => {
  const [entries, setEntries] = React.useState<EntryType[]>([]);
  return (
    <div style={{ width: '60%', marginBottom: 20 }}>
      <h3>Text labels</h3>
      <BBoxAnnotator
        url="https://images.unsplash.com/photo-1601758003122-74ee9c837035?auto=format&fit=crop&w=800&q=80"
        inputMethod="text"
        onChange={setEntries}
      />
      <pre>{JSON.stringify(entries, null, 2)}</pre>
    </div>
  );
};

const App: React.FC = () => (
  <>
    <ExampleSelect />
    <ExampleText />
  </>
);

ReactDOM.render(<App />, document.getElementById('root'));
