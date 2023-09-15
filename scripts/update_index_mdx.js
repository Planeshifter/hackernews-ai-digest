const path = require('path');
const fs = require('fs');


// Get digest files from the data directory:
let digests = fs
    .readdirSync( path.join( __dirname, '..', 'data' ) )
    .filter( filename => filename.startsWith( 'digest_' ) );

// Sort digests by date in descending order:
digests.sort( ( a, b ) => {
    const aDate = new Date( a.replace( 'digest_', '' ).replace( '.md', '' ) );
    const bDate = new Date( b.replace( 'digest_', '' ).replace( '.md', '' ) );
    return bDate - aDate;
});
digests = digests.slice( 0, 3 );

let digestTexts = '';
for ( let i = 0; i < digests.length; i++ ) {
    const digest = digests[i];
    const text = fs.readFileSync( path.join( __dirname, '..', 'data', digest ), 'utf8' );
    digestTexts += text.trim();
    if ( i < digests.length - 1 ) {
        digestTexts += '\n\n---\n\n';
    }
}

let indexMDX = fs.readFileSync( path.join( __dirname, 'templates', 'index.mdx' ), 'utf8' );
indexMDX = indexMDX.replace( '{{digests}}', digestTexts );

fs.writeFileSync( path.join( __dirname, '..', 'www', 'src', 'pages', 'index.mdx' ), indexMDX, 'utf8' );
