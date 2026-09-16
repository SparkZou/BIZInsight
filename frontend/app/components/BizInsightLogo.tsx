export default function BizInsightLogo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={`${className} overflow-visible`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer Glow */}
            <circle cx="50" cy="50" r="45" className="stroke-neon-blue/30" strokeWidth="2">
                <animate
                    attributeName="r"
                    values="45;48;45"
                    dur="3s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="opacity"
                    values="0.3;0.6;0.3"
                    dur="3s"
                    repeatCount="indefinite"
                />
            </circle>

            {/* Main Container */}
            <rect x="20" y="20" width="60" height="60" rx="12" className="stroke-neon-blue" strokeWidth="4" fill="rgba(0, 243, 255, 0.1)" />

            {/* Animated Bars */}
            <rect x="35" y="55" width="8" height="15" rx="2" className="fill-neon-blue">
                <animate
                    attributeName="height"
                    values="15;25;15"
                    dur="2s"
                    repeatCount="indefinite"
                    begin="0s"
                />
                <animate
                    attributeName="y"
                    values="55;45;55"
                    dur="2s"
                    repeatCount="indefinite"
                    begin="0s"
                />
            </rect>

            <rect x="46" y="40" width="8" height="30" rx="2" className="fill-neon-purple">
                <animate
                    attributeName="height"
                    values="30;40;30"
                    dur="2.5s"
                    repeatCount="indefinite"
                    begin="0.2s"
                />
                <animate
                    attributeName="y"
                    values="40;30;40"
                    dur="2.5s"
                    repeatCount="indefinite"
                    begin="0.2s"
                />
            </rect>

            <rect x="57" y="30" width="8" height="40" rx="2" className="fill-neon-green">
                <animate
                    attributeName="height"
                    values="40;20;40"
                    dur="3s"
                    repeatCount="indefinite"
                    begin="0.4s"
                />
                <animate
                    attributeName="y"
                    values="30;50;30"
                    dur="3s"
                    repeatCount="indefinite"
                    begin="0.4s"
                />
            </rect>
        </svg>
    );
}
