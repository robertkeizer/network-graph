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

		// css files..
		}else if (path.match( /\.css$/ ) ){
			fs.readFile(__dirname+path,function(err,data){
				if(err){ return send404(res); };
				sendFile( res, data, 'text/css' );
			 } );
		
		// png files..
		}else if( path.match( /\.png$/ ) ){
			fs.readFile(__dirname+path,function(err,data){
				if(err){ return send404(res); }; 
				sendFile( res, data, 'image/png' );
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

		debug( "New client with ID of '" + client.sessionId + "'" );

		client.send( [ { request: 'filter' } ] );

		client.on( 'message', function( msg ){

			// Filter came back to server
			if( msg.request == 'filter' && typeof msg.response != 'undefined' ){
				debug( "Set filter to '" + msg.response + "' for client '" + client.sessionId + "'" );
				client.filter = msg.response;

			// If client requests the filter..
			}else if( msg.request == 'filter' && typeof msg.response == 'undefined' ){
				client.send( [ { request: 'filter', response: client.filter } ] );

			// Start the pcap session..
			}else if( msg.request == 'startPcap' ){
				if( typeof client.pcapSession == 'undefined' ){
					client.pcapSession = pcap.createSession( interface, client.filter );
					client.pcapSession.on( "packet", function( rawPacket ){
						var packet = pcap.decode.packet( rawPacket );
						
						// debug, just send all the packets with no formatting.
						client.send( packet );
					} );
				}else{
					// client.pcapSession is already defined.
					debug( "I don't know how to handle the creation of a pcap session that is already started.." );
				}
			}else if( msg.request == 'stopPcap' ){
				if( typeof client.pcapSession != 'undefined' ){
					// Stop the pcap session..
				}else{
					debug( "I cannot stop the pcap session that doesn't exist." );
				}
			}

		} );		// End of client.on
	} );			// End of ioInstance.on( 'connection' )
} 				// end of main
