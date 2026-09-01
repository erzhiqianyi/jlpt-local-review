import AppKit

let root = "/Users/itsuki/Documents/ChatGPT/JLPT/.design-qa/memory-card-layout"
let paths = [
    "\(root)/05-nyashiki-card-front-close.png",
    "\(root)/15-final-front-440.png",
    "\(root)/07-nyashiki-card-back.png",
    "\(root)/17-final-back-440.png",
]

let images = paths.compactMap(NSImage.init(contentsOfFile:))
guard images.count == 4 else { fatalError("Missing comparison image") }

let tile = NSSize(width: 440, height: 861)
let canvas = NSImage(size: NSSize(width: tile.width * 2, height: tile.height * 2))
canvas.lockFocus()
NSColor(calibratedWhite: 0.14, alpha: 1).setFill()
NSRect(origin: .zero, size: canvas.size).fill()

for (index, image) in images.enumerated() {
    let column = index % 2
    let row = index / 2
    let origin = NSPoint(
        x: CGFloat(column) * tile.width,
        y: CGFloat(1 - row) * tile.height
    )
    image.draw(in: NSRect(origin: origin, size: tile))
}
canvas.unlockFocus()

guard
    let tiff = canvas.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let png = bitmap.representation(using: .png, properties: [:])
else { fatalError("Could not encode comparison") }

try png.write(to: URL(fileURLWithPath: "\(root)/18-reference-main-comparison.png"))
