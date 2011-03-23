console.log( "Starting up.." );
var sys			= require( "sys" );
var dns			= require( "dns" );
var http		= require( "http" );
var pcap		= require( "pcap" );
var pcap_session	= pcap.createSession( "", "tcp port 80" );
console.log( "Listening on " + pcap_session.device_name );

var blacklistDnsCache = new Array();
blacklistDnsCache["192.168.1.100"] = 1;

var dnsCacheArray = new Array();
dnsCacheArray["127.0.0.1"] = "localhost";

pcap_session.on( "packet", function( raw_packet ){
	var packet	= pcap.decode.packet( raw_packet );
	if( typeof dnsCacheArray[packet.link.ip.daddr.toString()] == 'undefined' ){
		if( typeof blacklistDnsCache[packet.link.ip.daddr.toString()] == 'undefined' ){
			dns.reverse( packet.link.ip.daddr, function( err, domains ){
				if( !err ){
					for( var x=0; x<domains.length; x++ ){
						dnsCacheArray[packet.link.ip.daddr.toString()] = domains[x];
					}
				}else{
					blacklistDnsCache[packet.link.ip.daddr.toString()] = 1;
				}
			} );
		}else{
			//console.log( "Skipping blacklisted ip of " + packet.link.ip.daddr );
		}
	};

	if( typeof dnsCacheArray[packet.link.ip.daddr.toString()] != 'undefined' ){
		console.log( dnsCacheArray[packet.link.ip.daddr.toString()] );
	}else{
		console.log( packet.link.ip.daddr.toString() );
	}
} );
