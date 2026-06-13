export default function ParrotMascot({ height = 72, className = "", alt = "Beora" }) {
  const width = Math.round(height * 0.865)
  return (
    <img
      src="/mascot-coral.svg"
      width={width}
      height={height}
      alt={alt}
      className={"parrot-mascot" + (className ? " " + className : "")}
      draggable={false}
    />
  )
}
