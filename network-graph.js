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
	boundIo.broadcast( [ {	current_cap_time: session.current_cap_time, 
				session_key: session.key,
				status: status } ] );
};
