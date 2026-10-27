export default function AboutScreen() {
  return (
    <>
      <header className="screen-header">
        <h1>אודות</h1>
      </header>
      <main className="screen about">
        <section className="card" aria-labelledby="about-game">
          <h2 id="about-game">על המשחק</h2>
          <p>סיימון הוא משחק זיכרון: המשחק מציג רצף צבעים וצלילים, ואתם משחזרים אותו.</p>
          <ul>
            <li>זכרו את רצף הצבעים שמוצג.</li>
            <li>לחצו על הצבעים באותו הסדר.</li>
            <li>בכל שלב מתווסף צבע אחד. טעות אחת מסיימת את המשחק.</li>
            <li>נסו להגיע עד שלב 10!</li>
          </ul>
        </section>

        <section aria-labelledby="history-title">
          <h2 id="history-title">10 המשחקים האחרונים</h2>
          <div className="card card--empty">אין עדיין משחקים שמורים</div>
        </section>
      </main>
    </>
  )
}
