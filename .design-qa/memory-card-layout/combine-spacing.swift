import AppKit

struct Panel {
    let title: String
    let image: NSImage
}

let arguments = CommandLine.arguments
guard arguments.count == 4 || arguments.count == 6 else {
    fputs("Usage: combine-spacing reference final output [reference-title final-title]\n", stderr)
    exit(1)
}

func load(_ path: String) -> NSImage {
    guard let image = NSImage(contentsOfFile: path) else {
        fputs("Unable to load \(path)\n", stderr)
        exit(2)
    }
    return image
}

let panels = [
    Panel(title: arguments.count == 6 ? arguments[4] : "修改前", image: load(arguments[1])),
    Panel(title: arguments.count == 6 ? arguments[5] : "修改后", image: load(arguments[2]))
]
let panelWidth: CGFloat = 420
let panelHeight: CGFloat = 740
let gutter: CGFloat = 24
let header: CGFloat = 54
let canvas = NSSize(width: panelWidth * 2 + gutter * 3, height: panelHeight + header + gutter * 2)
let output = NSImage(size: canvas)

output.lockFocus()
NSColor(calibratedWhite: 0.93, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: canvas)).fill()

for (index, panel) in panels.enumerated() {
    let x = gutter + CGFloat(index) * (panelWidth + gutter)
    let frame = NSRect(x: x, y: gutter, width: panelWidth, height: panelHeight)
    NSColor.white.setFill()
    NSBezierPath(roundedRect: frame, xRadius: 18, yRadius: 18).fill()

    let ratio = min((panelWidth - 20) / panel.image.size.width, (panelHeight - 20) / panel.image.size.height)
    let size = NSSize(width: panel.image.size.width * ratio, height: panel.image.size.height * ratio)
    let imageRect = NSRect(x: x + (panelWidth - size.width) / 2,
                           y: gutter + (panelHeight - size.height) / 2,
                           width: size.width,
                           height: size.height)
    panel.image.draw(in: imageRect)

    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 20, weight: .semibold),
        .foregroundColor: NSColor(calibratedWhite: 0.18, alpha: 1)
    ]
    let text = NSAttributedString(string: panel.title, attributes: attributes)
    let textSize = text.size()
    text.draw(at: NSPoint(x: x + (panelWidth - textSize.width) / 2,
                          y: gutter + panelHeight + 16))
}

output.unlockFocus()
guard let data = output.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: data),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    exit(3)
}
try png.write(to: URL(fileURLWithPath: arguments[3]))
