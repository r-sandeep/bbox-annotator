import React, {
    useRef,
    useEffect,
    useState,
    useImperativeHandle,
    useLayoutEffect,
} from 'react';
import { createUseStyles } from 'react-jss';
import { v4 as uuid } from 'uuid';
import BBoxSelector from '../BBoxSelector';
import LabelBox from '../LabelBox';

export type EntryType = {
    left: number;
    top: number;
    width: number;
    height: number;
    label: string;
};
const useStyles = createUseStyles({
    bBoxAnnotator: {
        cursor: 'crosshair',
        width: '100%',
        position: 'relative',
    },
    imageFrame: {
        position: 'relative',
        backgroundSize: '100%',
    },
});
type Props = {
    url: string;
    inputMethod: 'text' | 'select';
    labels?: string | string[];
    onChange: (entries: EntryType[]) => void;
    borderWidth?: number;
    initialEntries?: EntryType[];
};

const BBoxAnnotator = React.forwardRef<any, Props>(
    ({ url, borderWidth = 2, inputMethod, labels, onChange, initialEntries }, ref) => {
        const classes = useStyles();
        const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
        const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
        const [entries, setEntries] = useState<
            ({
                id: string;
                showCloseButton: boolean;
            } & EntryType)[]
        >([]);
        const [multiplier, setMultiplier] = useState(1);
        const [imageLoaded, setImageLoaded] = useState(false);
        const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
        const skipOnChange = useRef(true);
        useEffect(() => {
            if (skipOnChange.current) {
                skipOnChange.current = false;
                return;
            }
            onChange(
                entries.map((entry) => ({
                    width: Math.round(entry.width * multiplier),
                    height: Math.round(entry.height * multiplier),
                    top: Math.round(entry.top * multiplier),
                    left: Math.round(entry.left * multiplier),
                    label: entry.label,
                })),
            );
        }, [entries, multiplier]);

        useEffect(() => {
            if (!imageLoaded) return;
            skipOnChange.current = true;
            if (initialEntries && initialEntries.length) {
                setEntries(
                    initialEntries.map((entry) => ({
                        id: uuid(),
                        showCloseButton: false,
                        label: entry.label,
                        left: Math.round(entry.left / multiplier),
                        top: Math.round(entry.top / multiplier),
                        width: Math.round(entry.width / multiplier),
                        height: Math.round(entry.height / multiplier),
                    })),
                );
            } else {
                setEntries([]);
            }
        }, [initialEntries, multiplier, imageLoaded]);
        const [status, setStatus] = useState<'free' | 'input' | 'hold' | 'drag' | 'resize'>('free');
        const [bBoxAnnotatorStyle, setBboxAnnotatorStyle] = useState<{ width?: number; height?: number }>({});
        const [imageFrameStyle, setImageFrameStyle] = useState<{
            width?: number;
            height?: number;
            backgroundImageSrc?: string;
        }>({});

        const bBoxAnnotatorRef = useRef<HTMLDivElement>(null);
        const labelInputRef = useRef<HTMLDivElement>(null);
        const [draggingId, setDraggingId] = useState<string | null>(null);
        const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
        const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
        const [dragMoved, setDragMoved] = useState(false);
        const [resizingId, setResizingId] = useState<string | null>(null);
        const [resizingCorner, setResizingCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
        const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null);
        const [resizeBox, setResizeBox] = useState<EntryType | null>(null);
        const [editingId, setEditingId] = useState<string | null>(null);
        useEffect(() => {
            const imageElement = new Image();
            imageElement.src = url;
            imageElement.onload = function () {
                setImageSize({ width: imageElement.width, height: imageElement.height });
                setImageLoaded(true);
            };
            imageElement.onerror = function () {
                throw 'Invalid image URL: ' + url;
            };
        }, [url]);

        useLayoutEffect(() => {
            if (!imageLoaded || !imageSize) return undefined;
            const node = bBoxAnnotatorRef.current;
            if (!node) return undefined;
            const updateSize = () => {
                const maxWidth = node.offsetWidth || 1;
                const m = imageSize.width / maxWidth;
                setMultiplier(m);
                setBboxAnnotatorStyle({
                    width: imageSize.width / m,
                    height: imageSize.height / m,
                });
                setImageFrameStyle({
                    backgroundImageSrc: url,
                    width: imageSize.width / m,
                    height: imageSize.height / m,
                });
            };
            updateSize();
            const ro = new ResizeObserver(updateSize);
            ro.observe(node);
            return () => ro.disconnect();
        }, [imageLoaded, imageSize, url]);

        const crop = (pageX: number, pageY: number) => {
            return {
                x:
                    bBoxAnnotatorRef.current && imageFrameStyle.width
                        ? Math.min(
                              Math.max(Math.round(pageX - bBoxAnnotatorRef.current.offsetLeft), 0),
                              Math.round(imageFrameStyle.width - 1),
                          )
                        : 0,
                y:
                    bBoxAnnotatorRef.current && imageFrameStyle.height
                        ? Math.min(
                              Math.max(Math.round(pageY - bBoxAnnotatorRef.current.offsetTop), 0),
                              Math.round(imageFrameStyle.height - 1),
                          )
                        : 0,
            };
        };
        const updateRectangle = (pageX: number, pageY: number) => {
            setPointer(crop(pageX, pageY));
        };

        useEffect(() => {
            const mouseMoveHandler = (e: MouseEvent) => {
                switch (status) {
                    case 'hold':
                        updateRectangle(e.pageX, e.pageY);
                        break;
                    case 'drag':
                        if (draggingId && dragOffset && dragStart) {
                            const pos = crop(e.pageX, e.pageY);
                            if (!dragMoved) {
                                const dx = pos.x - dragStart.x;
                                const dy = pos.y - dragStart.y;
                                const distanceSquared = dx * dx + dy * dy;
                                if (distanceSquared > 9) {
                                    setDragMoved(true);
                                }
                            }
                            setEntries((prev) =>
                                prev.map((entry) => {
                                    if (entry.id === draggingId) {
                                        const maxX = (imageFrameStyle.width || 0) - entry.width;
                                        const maxY = (imageFrameStyle.height || 0) - entry.height;
                                        return {
                                            ...entry,
                                            left: Math.min(Math.max(pos.x - dragOffset.x, 0), maxX),
                                            top: Math.min(Math.max(pos.y - dragOffset.y, 0), maxY),
                                        };
                                    }
                                    return entry;
                                }),
                            );
                        }
                        break;
                    case 'resize':
                        if (resizingId && resizeStart && resizeBox && resizingCorner) {
                            const pos = crop(e.pageX, e.pageY);
                            const dx = pos.x - resizeStart.x;
                            const dy = pos.y - resizeStart.y;
                            setEntries((prev) =>
                                prev.map((entry) => {
                                    if (entry.id === resizingId) {
                                        let { left, top, width, height } = resizeBox;
                                        const maxWidth = (imageFrameStyle.width || 0);
                                        const maxHeight = (imageFrameStyle.height || 0);
                                        switch (resizingCorner) {
                                            case 'se':
                                                width = Math.min(Math.max(width + dx, 1), maxWidth - left);
                                                height = Math.min(Math.max(height + dy, 1), maxHeight - top);
                                                break;
                                            case 'sw':
                                                left = Math.min(Math.max(left + dx, 0), left + width - 1);
                                                width = Math.min(Math.max(width - dx, 1), maxWidth - left);
                                                height = Math.min(Math.max(height + dy, 1), maxHeight - top);
                                                break;
                                            case 'ne':
                                                top = Math.min(Math.max(top + dy, 0), top + height - 1);
                                                height = Math.min(Math.max(height - dy, 1), maxHeight - top);
                                                width = Math.min(Math.max(width + dx, 1), maxWidth - left);
                                                break;
                                            case 'nw':
                                                left = Math.min(Math.max(left + dx, 0), left + width - 1);
                                                top = Math.min(Math.max(top + dy, 0), top + height - 1);
                                                width = Math.min(Math.max(width - dx, 1), maxWidth - left);
                                                height = Math.min(Math.max(height - dy, 1), maxHeight - top);
                                                break;
                                        }
                                        return { ...entry, left, top, width, height };
                                    }
                                    return entry;
                                }),
                            );
                        }
                }
            };
            window.addEventListener('mousemove', mouseMoveHandler);
            return () => window.removeEventListener('mousemove', mouseMoveHandler);
        }, [status, draggingId, dragOffset, imageFrameStyle, resizeStart, resizeBox, resizingId, resizingCorner]);

        useEffect(() => {
            const mouseUpHandler = (e: MouseEvent) => {
                switch (status) {
                    case 'hold':
                        updateRectangle(e.pageX, e.pageY);
                        setStatus('input');
                        break;
                    case 'drag':
                        if (!dragMoved && draggingId) {
                            setEditingId(draggingId);
                            setStatus('input');
                        } else {
                            setStatus('free');
                        }
                        setDraggingId(null);
                        setDragOffset(null);
                        setDragStart(null);
                        setDragMoved(false);
                        break;
                    case 'resize':
                        setStatus('free');
                        setResizingId(null);
                        setResizingCorner(null);
                        setResizeStart(null);
                        setResizeBox(null);
                }
            };
            window.addEventListener('mouseup', mouseUpHandler);
            return () => window.removeEventListener('mouseup', mouseUpHandler);
        }, [status, labelInputRef, draggingId, dragOffset, resizingId, resizingCorner, resizeStart, resizeBox]);

        useEffect(() => {
            if (status === 'input') {
                labelInputRef.current?.focus();
            }
        }, [status]);

        const submitLabel = (label: string) => {
            if (editingId) {
                setEntries((prev) => prev.map((e) => (e.id === editingId ? { ...e, label } : e)));
                setEditingId(null);
            } else {
                setEntries((prev) => [...prev, { ...rect, label, id: uuid(), showCloseButton: false }]);
            }
            setStatus('free');
            setPointer(null);
            setOffset(null);
        };

        const mouseDownHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if (editingId) {
                setEditingId(null);
                setStatus('free');
            }
            switch (status) {
                case 'free':
                case 'input':
                    if (e.button !== 2) {
                        setOffset(crop(e.pageX, e.pageY));
                        setPointer(crop(e.pageX, e.pageY));
                        setStatus('hold');
                    }
            }
        };

        const rectangle = () => {
            const x1 = offset && pointer ? Math.min(offset.x, pointer.x) : 0;
            const x2 = offset && pointer ? Math.max(offset.x, pointer.x) : 0;
            const y1 = offset && pointer ? Math.min(offset.y, pointer.y) : 0;
            const y2 = offset && pointer ? Math.max(offset.y, pointer.y) : 0;
            return {
                left: x1,
                top: y1,
                width: x2 - x1 + 1,
                height: y2 - y1 + 1,
            };
        };

        useImperativeHandle(ref, () => ({
            reset() {
                setEntries([]);
            },
        }));
        const rect = rectangle();

        return (
            <div
                className={classes.bBoxAnnotator}
                style={{
                    width:
                        bBoxAnnotatorStyle.width !== undefined
                            ? `${bBoxAnnotatorStyle.width}px`
                            : undefined,
                    height:
                        bBoxAnnotatorStyle.height !== undefined
                            ? `${bBoxAnnotatorStyle.height}px`
                            : undefined,
                }}
                ref={bBoxAnnotatorRef}
                onMouseDown={mouseDownHandler}
            >
                <div
                    className={classes.imageFrame}
                    style={{
                        width:
                            imageFrameStyle.width !== undefined
                                ? `${imageFrameStyle.width}px`
                                : undefined,
                        height:
                            imageFrameStyle.height !== undefined
                                ? `${imageFrameStyle.height}px`
                                : undefined,
                        backgroundImage: imageFrameStyle.backgroundImageSrc
                            ? `url(${imageFrameStyle.backgroundImageSrc})`
                            : undefined,
                    }}
                >
                    {status === 'hold' || status === 'input' ? <BBoxSelector rectangle={rect} /> : null}
                    {status === 'input' ? (
                        <LabelBox
                            inputMethod={inputMethod}
                            top={rect.top + rect.height + borderWidth}
                            left={rect.left - borderWidth}
                            labels={labels}
                            onSubmit={submitLabel}
                            ref={labelInputRef}
                        />
                    ) : null}
                    {entries.map((entry) => (
                        <div
                            style={{
                                border: `${borderWidth}px solid rgb(255,0,0)`,
                                position: 'absolute',
                                top: `${entry.top - borderWidth}px`,
                                left: `${entry.left - borderWidth}px`,
                                width: `${entry.width}px`,
                                height: `${entry.height}px`,
                                color: 'rgb(255,0,0)',
                                fontFamily: 'monospace',
                                fontSize: 'small',
                                cursor: 'move',
                            }}
                            key={entry.id}
                            onMouseDown={(e) => {
                                if (e.button !== 2 && (status === 'free' || status === 'input')) {
                                    e.stopPropagation();
                                    const pos = crop(e.pageX, e.pageY);
                                    setDraggingId(entry.id);
                                    setDragOffset({ x: pos.x - entry.left, y: pos.y - entry.top });
                                    setDragStart(pos);
                                    setDragMoved(false);
                                    setEditingId(null);
                                    setPointer(null);
                                    setOffset(null);
                                    setStatus('drag');
                                }
                            }}
                            onMouseOver={() =>
                                setEntries((prevEntries) =>
                                    prevEntries.map((e) => (e.id === entry.id ? { ...e, showCloseButton: true } : e)),
                                )
                            }
                            onMouseLeave={() =>
                                setEntries((prevEntries) =>
                                    prevEntries.map((e) => (e.id === entry.id ? { ...e, showCloseButton: false } : e)),
                                )
                            }
                        >
                            {entry.showCloseButton ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '16px',
                                        height: '0',
                                        padding: '16px 0 0 0',
                                        overflow: 'hidden',
                                        color: '#fff',
                                        backgroundColor: '#030',
                                        border: '2px solid #fff',
                                        borderRadius: '18px',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        textAlign: 'center',
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onClick={() => {
                                        setEntries(entries.filter((e) => e.id !== entry.id));
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'block',
                                            textAlign: 'center',
                                            width: '16px',
                                            position: 'absolute',
                                            top: '-2px',
                                            left: '0',
                                            fontSize: '16px',
                                            lineHeight: '16px',
                                            fontFamily:
                                                '"Helvetica Neue", Consolas, Verdana, Tahoma, Calibri, ' +
                                                'Helvetica, Menlo, "Droid Sans", sans-serif',
                                        }}
                                    >
                                        &#215;
                                    </div>
                                </div>
                            ) : null}
                            {/* resize handles */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '-4px',
                                    top: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    background: 'rgb(255,0,0)',
                                    cursor: 'nwse-resize',
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const pos = crop(e.pageX, e.pageY);
                                    setResizingId(entry.id);
                                    setResizingCorner('nw');
                                    setResizeStart(pos);
                                    setResizeBox({ left: entry.left, top: entry.top, width: entry.width, height: entry.height, label: entry.label });
                                    setStatus('resize');
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '-4px',
                                    top: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    background: 'rgb(255,0,0)',
                                    cursor: 'nesw-resize',
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const pos = crop(e.pageX, e.pageY);
                                    setResizingId(entry.id);
                                    setResizingCorner('ne');
                                    setResizeStart(pos);
                                    setResizeBox({ left: entry.left, top: entry.top, width: entry.width, height: entry.height, label: entry.label });
                                    setStatus('resize');
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '-4px',
                                    bottom: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    background: 'rgb(255,0,0)',
                                    cursor: 'nesw-resize',
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const pos = crop(e.pageX, e.pageY);
                                    setResizingId(entry.id);
                                    setResizingCorner('sw');
                                    setResizeStart(pos);
                                    setResizeBox({ left: entry.left, top: entry.top, width: entry.width, height: entry.height, label: entry.label });
                                    setStatus('resize');
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '-4px',
                                    bottom: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    background: 'rgb(255,0,0)',
                                    cursor: 'nwse-resize',
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const pos = crop(e.pageX, e.pageY);
                                    setResizingId(entry.id);
                                    setResizingCorner('se');
                                    setResizeStart(pos);
                                    setResizeBox({ left: entry.left, top: entry.top, width: entry.width, height: entry.height, label: entry.label });
                                    setStatus('resize');
                                }}
                            />
                            <div style={{ overflow: 'hidden' }}>{entry.label}</div>
                            {editingId === entry.id ? (
                                <LabelBox
                                    inputMethod={inputMethod}
                                    top={entry.height + borderWidth}
                                    left={-borderWidth}
                                    labels={labels}
                                    onSubmit={submitLabel}
                                    ref={labelInputRef}
                                />
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        );
    },
);
export default BBoxAnnotator;
