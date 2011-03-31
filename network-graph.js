function debug( msg ){
	console.log( msg );
}

debug( "Starting up.." );

debug( "Setting defaults and creating variables.." );
var httpPort	= "8080";
var filter	= "tcp";
var interface	= "";
var pcapSession;
var ioInstance;

debug( "Including modules.." );

var sys			= require( "sys" );
var fs			= require( "fs" );
var http		= require( "http" );
var url			= require( "url" );
var io			= require( "socket.io" );
var pcap		= require( "pcap" );
var arguments		= require( "arguments" );

arguments.parse( [
	{ 'name': /^(-h|--help)$/, 'expected': null, 'callback': showHelp },
	{ 'name': /^(-p|--port)$/, 'expected': /^[0-9]*$/, 'callback': setPort },
	{ 'name': /^(-i|--interface)$/, 'expected': /[a-zA-Z0-9]*$/, 'callback': setInterface },
	{ 'name': /^(-f|--filter)$/, 'expected': /^[a-zA-Z.-0-9]*$/, 'callback': setFilter }
		], main, invalidArgument );


function showHelp( end ){
	var msg	= "Usage:	(-h|--help): This message.\n";
	msg	+="	(-p|--port): The HTTP port.\n";
	msg	+="	(-i|--interface): The interface to listen on.\n";
	msg	+="	(-f|--filter): The filter to utilize when listening on the device.\n";
	
	debug( msg );
	process.exit( 1 );
}

function setPort( end, portToSet ){
	httpPort	= portToSet;
	end( );
}

function setInterface( end, interfaceToListenOn ){
	interface	= interfaceToListenOn;
	end( );
}

function setFilter( end, filterToSet ){
	filter		= filterToSet;
	end( );
}

function invalidArgument( arg, missingValue ){
	if( missingValue ){
		debug( "Argument '" + arg + "' is missing." );
	}else{
		debug( "Argument '" + arg + "' is invalid." );
	}
}

function main( ){

	debug( "Starting HTTP server on port " + httpPort );

	httpServer = http.createServer( function(req,res){
		var path = url.parse(req.url).pathname;

		// No file specified - shove to view.html
		if( path == '/' ){
			var path = '/view.html';
			fs.readFile(__dirname+path,function(err,data){
				if(err){ return send404(res); };
				sendFile( res, data, 'text/html' );
			} );

		// html files..
		}else if ( path.match( /\.html$/ ) ){
			fs.readFile(__dirname+path,function(err,data){
				if(err){ return send404(res); };
				sendFile( res, data, 'text/html' );
			} );

		// javascript files..
		}else if ( path.match( /\.js$/ ) ){
			fs.readFile(__dirname+path,function(err,data){
				if(err){ return send404(res); };
			sendFile( res, data, 'text/javascript' );
		} );

		// not found.
		}else{
			send404(res);
		};
	} );

	function sendFile( res, msg, contentType ){
		res.writeHead( 200, {'Content-Type': contentType} );
		res.write( msg );
		res.end();
	}

	function send404( res ){
		res.writeHead(404);
		res.write('404');
		res.end();
	}

	httpServer.listen(httpPort);


	debug( "Starting up socket.io.." );
	ioInstance = io.listen( httpServer );

	debug( "Starting pcap sesion on interface '" + interface + "' with filter '" + filter + "'" );
	pcapSession = pcap.createSession( interface, filter );

} // end of main
