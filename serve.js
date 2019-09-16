const fetch = require( 'node-fetch' )
const jsdom = require( 'jsdom' )
const { JSDOM } = jsdom

const express = require('express')
const app = express()
const PORT = process.env.PORT || 5000

app.get('/', (req, res) => {

	if ( ('stock' in req.query) === false ) {

		res.send('empty ?stock=')

	} else {

		parseYahooStockHistory( req.query.stock )
		.then((result) => {
			res.json( result )
		})
	}

})

app.listen(PORT, () => console.log(`Listening`))



async function parseYahooStockHistory( stock = '' ) {
	if ( stock === '' ) { return false }

	const link = `https://finance.yahoo.com/quote/${stock}/history?p=${stock}`

	const r = await fetch( link )
	const resp = await r.text()

	const result = {
		link ,
		mail_sent: false
	}

	try {
		const dom = new JSDOM( resp )
		const table = dom.window.document.querySelector("table[data-test='historical-prices']")

		const firstRow = table.querySelectorAll('tbody tr')[0]
		const secondRow = table.querySelectorAll('tbody tr')[1]

		let firstRowCells = firstRow.querySelectorAll('td')
		let secondRowCells = secondRow.querySelectorAll('td')


		let rowData1 = {}

		rowData1.date = firstRowCells[0].querySelector('span').innerHTML
		rowData1.open = parseFloat(firstRowCells[1].querySelector('span').innerHTML)
		rowData1.high = parseFloat(firstRowCells[2].querySelector('span').innerHTML)
		rowData1.low = parseFloat(firstRowCells[3].querySelector('span').innerHTML)
		rowData1.close = parseFloat(firstRowCells[4].querySelector('span').innerHTML)
		rowData1.adjClose = parseFloat(firstRowCells[5].querySelector('span').innerHTML)


		let rowData2 = {}

		rowData2.date = secondRowCells[0].querySelector('span').innerHTML
		rowData2.open = parseFloat(secondRowCells[1].querySelector('span').innerHTML)
		rowData2.high = parseFloat(secondRowCells[2].querySelector('span').innerHTML)
		rowData2.low = parseFloat(secondRowCells[3].querySelector('span').innerHTML)
		rowData2.close = parseFloat(secondRowCells[4].querySelector('span').innerHTML)
		rowData2.adjClose = parseFloat(secondRowCells[5].querySelector('span').innerHTML)

		const prev = rowData2
		const last = rowData1

		let nao = ( ( prev.open + prev.adjClose ) / 2 )
		let nac = ( ( last.open + last.high + last.low + last.adjClose ) / 4 )

		;(nac > nao) ? console.log('green') : console.log('red')

		result.color = ( (nac > nao) ? 'green' : 'red' )
		result.dates = `${prev.date} -- ${last.date}`


		const msg = {
			personalizations: [{ to: [{email:'coidandred@yahoo.com'}] }] ,
			from: { email: 'example@example.com' },
			subject: 'HeikinAshiColor '+stock,
			content: [{
				type: 'text/plain' ,
				value: 'error'
			}]
		};

		if ( nac > nao ) {
			msg.content.value = 'green'

		} else {
			msg.content.value = 'red'
		}

		let sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
			method: 'POST',
			headers: {
				"Authorization": "Bearer "+process.env.SENDGRID_KEY ,
				"Content-Type": "application/json"
			} ,

			body: JSON.stringify( msg )
		})

		if ( sendgridResponse.status === 202 ) {
			result.mail_sent = true
		}

		// sendgridResponse = await sendgridResponse.text()
	} catch ( e ) {
		console.log( e )
		result.info = 'yahoo symbol not found, prabably'
	}

	return result
}
