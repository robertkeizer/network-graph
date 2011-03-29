console.log( "Starting up.." );
var sys			= require( "sys" );
var fs			= require( "fs" );
var dns			= require( "dns" );
var http		= require( "http" );
var url			= require( "url" );
var io			= require( "socket.io" );
var pcap		= require( "pcap" );

var httpPort 		= "8080";
var filter		= "tcp";

var dnsHostCache		= Array( );
dnsHostCache['127.0.0.1']	= 'localhost';
var dnsHostBlacklist		= Array( );

console.log( "Starting HTTP server on port " + httpPort );

httpServer = http.createServer( function(req,res){
        var path = url.parse(req.url).pathname;

	// No file specified - shove to view.html
	if( path == '/' ){
		var path = '/view.html';
		fs.readFile(__dirname+path,function(err,data){
			if(err){ return send404(res); };
			sendMessage( res, data, 'text/html' );
		} );

	// html files..
	}else if ( path.match( /\.html$/ ) ){
		fs.readFile(__dirname+path,function(err,data){
			if(err){ return send404(res); };
			sendMessage( res, data, 'text/html' );
		} );

	// javascript files..
	}else if ( path.match( /\.js$/ ) ){
		fs.readFile(__dirname+path,function(err,data){
			if(err){ return send404(res); };
			sendMessage( res, data, 'text/javascript' );
		} );

	// not found.
	}else{
		send404(res);
	};
} );

function sendMessage( res, msg, contentType ){
	res.writeHead( 200, {'Content-Type': contentType} );
	res.write( msg, 'utf8' );
	res.end();
}

function send404( res ){
	res.writeHead(404);
	res.write('404');
	res.end();
}

httpServer.listen(httpPort);

var boundIo = io.listen( httpServer );
console.log( "Starting up socket.io .." );

var pcap_session	= pcap.createSession( "", filter );
var tcp_tracker		= new pcap.TCP_tracker( );

pcap_session.on( "packet", function( raw_packet ){
	tcp_tracker.track_packet( pcap.decode.packet( raw_packet ) );
} );

console.log( "Monitoring traffic on " + pcap_session.device_name + " with filter of '" + filter + "'.." );

tcp_tracker.on( 'start', function( session ){
	sendToClients( session, 'start' );
} );

tcp_tracker.on( 'end', function( session ){
	sendToClients( session, 'end' );
} );

function sendToClients( session, status ){
	// ports change frequently enough, we just want the IP's rather than the full key.
	var hostSessionKey	= session.key.replace( /:[0-9]*/g, '' );
	
	var sessionNameToSend	= getReverseDns( hostSessionKey );

	boundIo.broadcast( [ {	current_cap_time: session.current_cap_time, 
				session_key: sessionNameToSend,
				status: status } ] );
};

function getReverseDns( sessionKeyString ){
	var sessionKeyStringParts	= sessionKeyString.split( "-" );

	var possibleReturn		= Array( );
	for( var x=0; x<sessionKeyStringParts.length; x++ ){

		console.log( sessionKeyStringParts[x] );
		
		// Already in the dnsHostCache..
		if( typeof dnsHostCache[sessionKeyStringParts[x].toString()] != 'undefined' ){
			possibleReturn[x] = dnsHostCache[sessionKeyStringParts[x].toString()];
		// Blacklisted..
		}else if( typeof dnsHostBlacklist[sessionKeyStringParts[x].toString()] != 'undefined' ){
			possibleReturn[x] = sessionKeyStringParts[x];
		// Try and get dns.. add to blacklist if fail.
		}else{
			dns.reverse( sessionKeyStringParts[x], function( err, addresses ){
				if( err ){
					console.log( "Reverse dns for " + sessionKeyStringParts[x] + " failed." );
					dnsHostBlacklist.push( sessionKeyStringParts[x] );
					possibleReturn[x] = sessionKeyStringParts[x];
				}else{
					console.log( "Reverse dns for " + sessionKeyStringParts[x] + " is " + addresses[0] );

					// Only use the first address returned.. see documentation - dns.resolve 
					// returns an array.
					dnsHostCache[sessionKeyStringParts[x]] = addresses[0];
					possibleReturn[x] = addresses[0];
				}
			} );
		}
	}


	if( typeof possibleReturn[0] === 'undefined' ){
		possibleReturn[0] = sessionKeyStringParts[0];
	}

	if( typeof possibleReturn[1] === 'undefined' ){
		possibleReturn[1] = sessionKeyStringParts[1];
	}

	console.log( sys.inspect( possibleReturn ) );

	return possibleReturn[0] + "-" + possibleReturn[1];
}
