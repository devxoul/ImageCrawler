var util = require( "util" );
var http = require( "http" );
var fs = require( "fs" );


log( ":: Image Crawler v1.0.0 by. Xoul ::" );

if( getOption( "-h" ) || getOption( "--help" ) )
{
	log( "USAGE : node crawler --url URL [--options]" );
	log( "--url : 크롤링을 시작할 첫 URL." );
	log( "--max-threads : 크롤러 스레드 개수. 기본값 10." )
	log( "--interval : 로딩 간격 (ms). 기본값 10." );
	log( "--min-size : 이미지 최소 사이즈 (bytes). 기본값 0." );
	log( "--max-size : 이미지 최대 사이즈 (bytes). 0일 경우에는 제한 없음. 기본값 0." );
	log( "--save : 이미지 저장 경로. 존재하는 디렉토리여야함. 기본값 ./imgs" );
	log( "--log : 로그파일 저장 경로. 기본값 ./log.txt" );
	log( "-h | --help : 현재 도움말 보기." )
	process.exit( 0 );
}

var firstURL = getOption( "--url" );
if( !firstURL )
{
	log( "[ERROR] Invalid URL. -h or --help to see usage." );
	process.exit( 0 );
}

// Options
var maxLoadings = parseInt( getOption( "--max-threads" ) ) || 10;
var requestInterval = parseInt( getOption( "--interval" ) ) || 10;
var imgMinSize = parseInt( getOption( "--min-size" ) ) || 0;
var imgMaxSize = parseInt( getOption( "--max-size" ) ) || 0;
var saveDirectory = getOption( "--save" ) || "./imgs/";
var logStream = fs.createWriteStream( getOption( "--save" ) || "./log.txt", {flags: "a", encoding: "UTF-8", mode: 0666} );

var numLoadings = 0;
var urlQueue = new Array();
var urlHistory = new Array();

startCrawling( firstURL );

function startCrawling( firstURL )
{
	log( "Crawling start with url : " + firstURL );
	urlQueue.push( firstURL );
	setInterval( load, requestInterval );
}

function load()
{
	// debug( numLoadings + " : " + maxLoadings );
	if( numLoadings < maxLoadings && urlQueue.length > 0 )
		loadURL( urlQueue.shift() );
}

function loadURL( url )
{
	if( !url ) return;
	
	log( "[URL] " + url );
	
	var reqURL = require( "url" ).parse( url );
	var options = {
		host: reqURL.hostname,
		path: reqURL.pathname,
		port: 80
	};
	
	if( !reqURL.pathname ) return;
	var fileName = saveDirectory + "/" + reqURL.pathname.split( "/" ).pop() || reqURL.pathname.split( "/" ).pop();
	
	numLoadings ++;
	
	urlHistory.push( url );
	
	http.get( options, function( data )
	{
		numLoadings --;
		
		var contentType = data.headers['content-type'];
		if( !contentType ) return;
		
		if( fileName.indexOf( ".", 7 ) == -1 )
		{
			var extension = contentType.split( "/" )[1];
			if( extension == "jpeg" ) extension = "jpg";
			fileName += "." + extension;
		}
		
		// Loaded image
		if( contentType.indexOf( "image" ) > -1 )
		{
			var contentLength = parseInt( data.headers['content-length'] );
			if( imgMaxSize > 0 && contentLength > imgMaxSize ) return;
			if( contentLength < imgMinSize ) return;
			
			var imgData = "";
			
			data.setEncoding( "binary" );
			data.on( "data", function( chunk )
			{
				imgData += chunk;
			} );
			
			data.on( "end", function()
			{
				log( "[IMAGE] " + fileName );
				fs.writeFile( fileName, imgData, "binary" );
				
				numLoadings --;
			} );
		}
		
		// Loaded html page
		else if( contentType.indexOf( "text/html" ) > -1 )
		{
			var html = "";
			
			data.on( "data", function( chunk )
			{
				html += chunk;
			} );
			
			data.on( "end", function()
			{
				parseHTML( html, options.host, options.path );
			} );
		}
	} ).on( "error", function( e )
	{
		log( "[ERROR] " + e );
		numLoadings --;
	} );
}

function parseHTML( html, host, path )
{
	var urls = html.split( /(src|href)=(\"|\')/i );
	if( !urls ) return;
	
	for( var i = 1; i < urls.length; i++ )
	{
		var url = urls[i].split( /(\"|\')/ )[0];
		if( url == "src" || url == "href" || url =="" ) continue;
		if( url.indexOf( ".js" ) > -1 || url.indexOf( ".css" ) > -1 ) continue;
		if( url.indexOf( ".swf" ) > -1 || url.indexOf( ".css" ) > -1 ) continue;
		if( url.charAt( 0 ) == "#" ) continue;
		
		if( url.charAt( 0 ) == "/" )
			url = "http://" + host + url;
		
		// debug( url );
		// continue;
		
		if( urlHistory.indexOf( url ) == -1 )
			urlQueue.push( url );
	}
}

function log( message )
{
	//logStream.write( message + "\n" );
	util.puts( message );
}

function debug( object )
{
	util.debug( util.inspect( object ) );
}

function getOption( option )
{
	for( var i = 0; i < process.argv.length; i++ )
	{
		if( process.argv[i] == option )
		{
			if( option == "-h" || option == "--help" )
				return true;
			
			return process.argv[i + 1];
		}
	}
	
	return false;
}
