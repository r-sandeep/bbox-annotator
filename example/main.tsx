import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import BBoxAnnotator, { EntryType } from '../src';

const App = () => {
    const [entries, setEntries] = useState<EntryType[]>([
        { left: 40, top: 40, width: 100, height: 60, label: 'sample' },
    ]);

    return (
        <div style={{ width: '80%' }}>
            <BBoxAnnotator
                url="https://milkgenomics.org/wp-content/uploads/2013/08/bigstock-cows-mother-and-baby-3998546.jpg"
                labels={['cow']}
                inputMethod="select"
                borderWidth={2}
                initialEntries={entries}
                onChange={setEntries}
            />
            <pre>{JSON.stringify(entries, null, 2)}</pre>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
