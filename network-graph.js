#!/usr/bin/env node
function debug( msg ){
	console.log( msg );
}

debug( "Starting up.." );

debug( "Setting defaults and creating variables.." );
var httpPort	= "default";
var interface	= "";
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
	{ 'name': /^(-i|--interface)$/, 'expected': /[a-zA-Z0-9]*$/, 'callback': setInterface }
		], main, invalidArgument );


function showHelp( end ){
	var msg	= "\nUsage:	(-h|--help): This message.\n";
	msg	+="	(-p|--port): The HTTP port.\n";
	msg	+="	(-i|--interface): The interface to listen on.\n";
	
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

function invalidArgument( arg, missingValue ){
	if( missingValue ){
		debug( "Argument '" + arg + "' is missing." );
	}else{
		debug( "Argument '" + arg + "' is invalid." );
	}
}

function ioLog( msg ){
	// Disable socket messages right now..
}

function main( ){

	if( httpPort == "default" ){
		showHelp( );
	}

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
	ioInstance = io.listen( httpServer, { log: ioLog } );

	debug( "Setting listeners for socket.io.." );
	ioInstance.on( 'connection', function( client ){
		client.send( [ { request: 'filter' } ] );

		client.on( 'message', function( message ){
			if( message.request == 'filter' && typeof message.response != 'undefined' ){
				setFilter( client, message.response );
				startPcap( client );
			}
		} );

		function startPcap( clientObj ){
			debug( "Starting pcap session on interface '" + interface + "' with filter '" + clientObj.filter + "'" );
			clientObj.pcapSession	= pcap.createSession( interface, clientObj.filter );
			
			clientObj.pcapSession.on( "packet", function( rawPacket ){
				var packet = pcap.decode.packet( rawPacket );
				
			} );
		}

		function setFilter( clientObj, newFilter ){
			clientObj.filter = newFilter;
		}

	} );

} // end of main
