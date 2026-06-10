import { jsPDF } from 'jspdf'

interface OrderDetailType {
  id: string
  menu_item_id: string
  quantity: number
  price_at_time: number
  menu_items: {
    name: string
    category: string
  }
}

interface OrderType {
  id: string
  business_id: string
  table_id: string
  total: number
  created_at: string
  tables?: {
    table_number: number
  } | null
  order_details: OrderDetailType[]
}

export function generateInvoicePDF(order: OrderType, clientName: string, clientNit: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6' // A6 is typical for receipt printers
  })

  // Set font
  doc.setFont('helvetica')

  // Title / Header
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59) // Slate-800
  doc.text('GASTROLEDGER', 52, 12, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text('La Parrilla del Sol', 52, 16, { align: 'center' })
  doc.text('NIT: 9876543210', 52, 20, { align: 'center' })
  
  // Divider line
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.3)
  doc.line(10, 24, 95, 24)

  // Invoice details
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  doc.text('FACTURA COMERCIAL', 10, 29)
  
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  const orderIdShort = order.id.substring(0, 8).toUpperCase()
  doc.text(`Nro. Factura: FL-${orderIdShort}`, 10, 34)
  doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`, 10, 38)
  doc.text(`Mesa: ${order.tables?.table_number || 'Llevar'}`, 10, 42)

  // Client Details
  doc.line(10, 45, 95, 45)
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text(`Cliente: ${clientName || 'Consumidor Final'}`, 10, 49)
  doc.text(`NIT/CI: ${clientNit || '99001'}`, 10, 53)
  doc.line(10, 56, 95, 56)

  // Items headers
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('Cant', 10, 60)
  doc.text('Detalle', 22, 60)
  doc.text('Total', 95, 60, { align: 'right' })
  doc.line(10, 62, 95, 62)

  // Items rows
  let y = 66
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85) // Slate-700
  
  order.order_details.forEach(item => {
    // If y exceeds page limit, add page
    if (y > 130) {
      doc.addPage()
      y = 15
    }
    
    const qtyText = `x${item.quantity}`
    const nameText = item.menu_items?.name || 'Item'
    const totalText = `Bs. ${(item.price_at_time * item.quantity).toFixed(2)}`
    
    doc.text(qtyText, 10, y)
    doc.text(nameText, 22, y)
    doc.text(totalText, 95, y, { align: 'right' })
    y += 5
  })

  // Subtotals
  if (y > 120) {
    doc.addPage()
    y = 15
  }
  doc.line(10, y, 95, y)
  y += 4

  const totalVal = Number(order.total)

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL A PAGAR:', 65, y, { align: 'right' })
  doc.text(`Bs. ${totalVal.toFixed(2)}`, 95, y, { align: 'right' })
  
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('¡Gracias por su consumo!', 52, y, { align: 'center' })

  // Save the document
  doc.save(`Factura_${orderIdShort}.pdf`)
}
