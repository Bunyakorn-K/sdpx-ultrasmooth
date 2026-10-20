export function PersonArt({
  color = "#bde9da",
  variant = 0,
  large = false,
}: {
  color?: string;
  variant?: number;
  large?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 260 205"
      className={large ? "person-art large" : "person-art"}
      aria-hidden="true"
    >
      <path d="M-10 205V153Q60 60 150 101T280 155V215Z" fill={color} />
      <g
        stroke="#72304f"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={
            variant % 2
              ? "M111 90Q73 87 84 57Q79 35 102 37Q113 18 129 36Q151 29 156 52L145 86Z"
              : "M107 89Q79 80 85 58Q80 41 103 39Q112 23 132 37Q155 39 153 62L145 88Z"
          }
          fill="#75234e"
        />
        <path d="M106 82L101 112L144 117L135 77" fill="#fff9f4" />
        <path
          d="M101 103Q73 108 63 134L47 199H188L176 133Q164 112 139 106Q123 126 101 103Z"
          fill={
            variant === 1
              ? "#62b9cf"
              : variant === 2
                ? "#f87578"
                : variant === 3
                  ? "#ffc153"
                  : "#52bf9d"
          }
        />
        <path
          d="M101 53Q110 64 137 53L141 76Q136 99 119 96Q99 90 100 69Z"
          fill="#fff9f4"
        />
        <path
          d="M111 70L114 70M131 68L134 68M123 72L120 81L125 81M119 87Q126 91 131 85"
          fill="none"
        />
        <path
          d="M74 144L87 175L142 178L150 194L72 194Q58 191 55 180M165 144L155 179L128 182L124 195L174 194Q184 190 183 180"
          fill="none"
        />
        <path d="M110 146H205L187 198H93Z" fill="#fff9f8" />
        <ellipse cx="157" cy="174" rx="5" ry="6" fill="none" />
        <path d="M88 200H207" fill="none" />
        {variant === 0 && (
          <path d="M83 63Q56 55 61 76Q65 90 87 83" fill="#75234e" />
        )}
      </g>
      {large && (
        <>
          <rect x="32" y="30" width="37" height="37" rx="8" fill="#36ad94" />
          <path
            d="M43 48L51 55L61 41"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="207" cy="82" r="20" fill="#ed535b" />
          <path
            d="M199 82L205 88L216 75"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
